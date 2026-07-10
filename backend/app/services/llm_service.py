"""
llm_service.py

Turns raw SHAP output into human-readable text via Groq's LLaMA 3.3 70B
API. Two modes:

  1. plain_narrative()  -- a short, plain-English explanation for a
     fraud analyst dashboard: "why was this flagged?"
  2. basel_audit_narrative() -- a longer, formally-structured narrative
     matching the tone/structure regulators expect for audit trails,
     loosely modeled on Basel III operational risk documentation
     conventions (named risk driver, quantified rationale, and a
     recommended action) -- this is the paper's "Regulatory Compliance"
     and "Accountability" gap addressed directly.

If GROQ_API_KEY isn't set (e.g. in this dev sandbox), both functions
return a clearly-labeled fallback narrative built from the SHAP data
directly (template-based, not LLM-generated) -- so the rest of the
pipeline (storage, API response, frontend rendering) can be developed
and tested without needing real API credentials yet.
"""

from app.core.config import settings
from app.core.retry import with_retry
from app.core.logging_config import get_logger

logger = get_logger(__name__)

try:
    from groq import Groq
    _groq_available = True
except ImportError:
    _groq_available = False


def _get_client():
    if not settings.GROQ_API_KEY or not _groq_available:
        return None
    return Groq(api_key=settings.GROQ_API_KEY)


def _format_top_features(top_features: list[dict]) -> str:
    lines = []
    for f in top_features:
        direction = "increased" if f["direction"] == "toward_fraud" else "decreased"
        lines.append(
            f"- {f['feature']} = {f['feature_value']:.3f} "
            f"({direction} fraud likelihood, contribution {f['shap_value']:+.3f})"
        )
    return "\n".join(lines)


@with_retry(exception_types=(Exception,))
def _call_groq(client, system_prompt: str, user_prompt: str, max_tokens: int = 400) -> str:
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=max_tokens,
        temperature=0.3,
    )
    return completion.choices[0].message.content.strip()


def _fallback_plain_narrative(explanation: dict) -> str:
    prob = explanation["fraud_probability"]
    top = explanation["top_features"][:3]
    feature_desc = "; ".join(
        f"{f['feature']} ({'raised' if f['direction']=='toward_fraud' else 'lowered'} risk)"
        for f in top
    )
    return (
        f"[Template fallback -- GROQ_API_KEY not set] "
        f"This transaction was scored at {prob:.1%} fraud probability. "
        f"The strongest contributing factors were: {feature_desc}."
    )


def _fallback_basel_narrative(explanation: dict, transaction_id: int) -> str:
    prob = explanation["fraud_probability"]
    top = explanation["top_features"]
    lines = [
        f"[Template fallback -- GROQ_API_KEY not set]",
        f"AUDIT NARRATIVE — Transaction #{transaction_id}",
        f"Risk Classification: {'HIGH' if prob >= 0.85 else 'MODERATE' if prob >= 0.5 else 'LOW'} "
        f"(model-estimated fraud probability: {prob:.1%})",
        "",
        "Risk Drivers Identified:",
    ]
    for f in top:
        lines.append(
            f"  - {f['feature']}: observed value {f['feature_value']:.3f}, "
            f"SHAP contribution {f['shap_value']:+.3f} "
            f"({'elevates' if f['direction']=='toward_fraud' else 'reduces'} risk)"
        )
    lines += [
        "",
        "Recommended Action: " +
        ("Escalate for manual review and consider transaction hold pending verification."
         if prob >= 0.85 else
         "Monitor; no immediate action required." if prob < 0.5 else
         "Flag for analyst review within standard SLA."),
    ]
    return "\n".join(lines)


def plain_narrative(explanation: dict) -> str:
    client = _get_client()
    if client is None:
        return _fallback_plain_narrative(explanation)

    system_prompt = (
        "You are a fraud detection assistant. Explain, in 2-3 plain-English "
        "sentences, why a transaction was flagged, based on the SHAP feature "
        "contributions provided. Do not use jargon. Be concrete and specific "
        "about the numbers given."
    )
    user_prompt = (
        f"Fraud probability: {explanation['fraud_probability']:.1%}\n\n"
        f"Top contributing features:\n{_format_top_features(explanation['top_features'])}\n\n"
        f"Write a short, plain-English explanation of this fraud decision."
    )

    try:
        return _call_groq(client, system_prompt, user_prompt, max_tokens=200)
    except Exception as e:
        logger.error(f"Groq call failed after retries, using fallback narrative: {e}")
        return _fallback_plain_narrative(explanation)


def basel_audit_narrative(explanation: dict, transaction_id: int) -> str:
    client = _get_client()
    if client is None:
        return _fallback_basel_narrative(explanation, transaction_id)

    system_prompt = (
        "You are a compliance officer drafting a formal audit narrative for a "
        "financial institution's fraud detection system, in the style expected "
        "for Basel III operational risk documentation. Structure your response "
        "with: (1) a risk classification, (2) the specific quantified risk "
        "drivers from the data provided, and (3) a recommended action. Be "
        "precise, formal, and reference the exact feature contributions given. "
        "Do not invent information not present in the data."
    )
    user_prompt = (
        f"Transaction ID: {transaction_id}\n"
        f"Model-estimated fraud probability: {explanation['fraud_probability']:.1%}\n\n"
        f"SHAP feature contributions (top drivers):\n"
        f"{_format_top_features(explanation['top_features'])}\n\n"
        f"Draft a formal audit narrative for this transaction."
    )

    try:
        return _call_groq(client, system_prompt, user_prompt, max_tokens=500)
    except Exception as e:
        logger.error(f"Groq call failed after retries, using fallback narrative: {e}")
        return _fallback_basel_narrative(explanation, transaction_id)
