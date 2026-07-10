# FedXplain — Privacy-Preserving, Explainable Fraud Detection

Final-year project extending FraudGuard AI: federated learning across
simulated banks (privacy-preserving) + XGBoost production scoring +
SHAP/LLM explainability + a full production-style API (auth, RBAC,
real-time alerts, audit logging, model versioning).

## What's in this codebase

| Layer | What it does | Key files |
|---|---|---|
| **Federated Learning** | FedAvg across 5 simulated banks, non-IID data, no raw data sharing | `federated/` |
| **Baselines** | Isolated single-bank + centralized (pooled) comparisons | `evaluation/baseline_*.py` |
| **Production scoring engine** | XGBoost, trained on pooled data, much higher accuracy than the linear federated model | `evaluation/train_xgboost.py` |
| **Explainability** | SHAP (TreeExplainer) + Groq LLaMA narratives (plain-English + Basel III audit style) | `app/services/shap_service.py`, `app/services/llm_service.py` |
| **API** | FastAPI: JWT auth, RBAC (Admin/Analyst/Auditor), CSV batch upload, WebSocket alerts, email notifications, model versioning, audit logs | `app/` |
| **Tests** | 14 passing pytest tests covering auth/RBAC/predict | `tests/test_api.py` |

## Setup

```bash
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Copy the environment template and fill in real values (JWT secret, Groq API key, SMTP creds if you want real email alerts):
```bash
cp .env.example .env
```
At minimum, set a real `JWT_SECRET_KEY` (`openssl rand -hex 32`) and your `GROQ_API_KEY` — without a Groq key, the LLM narrative endpoints still work but return a clearly-labeled template fallback instead of real LLM-generated text.

## IMPORTANT: get the real dataset before your final report

This repo ships without `data/raw/creditcard.csv` (too large / not ours to
redistribute). Download the real one:

**https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud**

Place it at `data/raw/creditcard.csv` (284,807 rows). No code changes
needed — the synthetic generator below matches this exact schema so
everything downstream just works once the real file is in place.

If you don't have the real file yet and just want to test the pipeline
runs, generate a synthetic stand-in:
```bash
python3 data/generate_synthetic_data.py
```
**Do NOT run this if you've already placed the real CSV — it will overwrite it.**

## Run order

```bash
# 1. Partition data across 5 simulated banks (non-IID)
PYTHONPATH=. python3 federated/partition_data.py

# 2. Federated training (FedAvg, privacy-preserving research contribution)
PYTHONPATH=. python3 federated/train_federated.py

# 3. Baselines for comparison (isolated banks vs. pooled/centralized)
PYTHONPATH=. python3 evaluation/baseline_single_bank.py
PYTHONPATH=. python3 evaluation/baseline_centralized.py

# 4. XGBoost -- the production scoring engine actually served by the API
PYTHONPATH=. python3 evaluation/train_xgboost.py

# 5. Register the trained XGBoost model as the active model version
PYTHONPATH=. python3 app/bootstrap_model.py

# 6. Start the API
uvicorn app.main:app --reload --port 8000
```

Swagger docs: **http://localhost:8000/docs**

## Quick smoke test

```bash
PYTHONPATH=. python3 smoke_test.py
```
Walks through: register users, login, role-gated predict, audit logs,
SHAP explanation, Basel III narrative, combined predict+explain.

## Run the test suite

```bash
PYTHONPATH=. pytest tests/ -v
```

## Docker

```bash
docker compose up --build
```
Note: not tested against a live Docker daemon in the dev environment
this was built in — please verify it builds cleanly on your machine
before demo day, and fix any small issues that come up (paths/versions
can occasionally need a tweak across environments).

## Architecture notes worth knowing for your viva

**Why two models (federated logistic regression AND XGBoost)?**
The federated model is the privacy-preserving research contribution --
it proves banks can collaboratively improve fraud detection without
sharing raw data (FedAvg, McMahan et al. 2017). XGBoost is the
production scoring engine actually serving `/predict` -- tree ensembles
substantially outperform linear models on tabular fraud data, which is
well-documented in the literature (see Table 1 of the IEEE Access survey
this project is grounded in). Federating tree ensembles is a harder,
separately-researched problem (secure histogram aggregation) that's
intentionally out of scope here -- state this explicitly if asked.

**Why FedAvg is hand-rolled instead of using the `flwr` package:**
Algorithmically identical to what Flower does for this model type, but
avoids a heavy dependency chain and is easier to explain line-by-line in
a viva, since every step of the aggregation is code you can point to and
explain yourself.

**Why SHAP TreeExplainer specifically:**
Exact and fast for tree ensembles (XGBoost), unlike KernelExplainer which
is a slow, approximate, model-agnostic method needed for non-tree models.

**Two distinct narrative types, cached separately:**
`/explain/{id}` (plain-English, dashboard-facing) and
`/explain/{id}/basel` (formal Basel III-style audit narrative,
compliance-facing) use different prompts for different audiences and are
stored in separate DB columns -- they are never the same text, and each
is only computed the first time it's actually requested.

## What's NOT yet built
- Frontend (React dashboard, bank simulation visualization, graph
  visualization of transaction networks)
- Federated learning for the XGBoost engine itself (currently only the
  logistic regression model is federated; XGBoost is centrally trained
  as the production engine -- see note above)
