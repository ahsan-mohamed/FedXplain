"""
email_service.py

Sends fraud alert emails via SMTP. Wrapped with @with_retry so transient
SMTP failures (network blip, server busy) are retried automatically with
exponential backoff before giving up and logging a failure.

If EMAIL_ALERTS_ENABLED is False (default, since no SMTP creds are set
in a dev sandbox), this logs what WOULD have been sent instead of
actually sending -- so the rest of the pipeline (prediction -> alert
trigger) can still be tested end-to-end without real credentials.
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import settings
from app.core.retry import with_retry
from app.core.logging_config import get_logger

logger = get_logger(__name__)


@with_retry(exception_types=(smtplib.SMTPException, ConnectionError, TimeoutError))
def _send_email(to_email: str, subject: str, body: str):
    msg = MIMEMultipart()
    msg["From"] = settings.SMTP_FROM_EMAIL
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
        server.starttls()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM_EMAIL, to_email, msg.as_string())


def send_fraud_alert_email(to_email: str, transaction_id: int, probability: float):
    subject = f"[FedXplain] High-risk fraud alert — Transaction #{transaction_id}"
    body = (
        f"A transaction was flagged as high-risk fraud.\n\n"
        f"Transaction ID: {transaction_id}\n"
        f"Fraud probability: {probability:.2%}\n\n"
        f"Please review in the FedXplain dashboard."
    )

    if not settings.EMAIL_ALERTS_ENABLED:
        logger.info(
            f"[EMAIL DISABLED - would send] To: {to_email} | Subject: {subject}"
        )
        return {"sent": False, "reason": "email_alerts_disabled"}

    try:
        _send_email(to_email, subject, body)
        logger.info(f"Fraud alert email sent to {to_email} for transaction {transaction_id}")
        return {"sent": True}
    except Exception as e:
        logger.error(
            f"Failed to send fraud alert email to {to_email} after retries: {e}",
            exc_info=True,
        )
        return {"sent": False, "reason": str(e)}
