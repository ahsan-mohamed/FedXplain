# FedXplain

**Federated Intelligence. Transparent Decisions.**

A privacy-preserving, explainable AI platform for financial fraud detection — built as a final-year Computer Science (AI/ML) project extending research on federated learning and explainable AI for fraud detection systems.

🔗 **Live App:** https://fed-xplain-lsu7.vercel.app
🔗 **API Docs (Swagger):** https://fedxplain.onrender.com/docs

> Click **"Try it out"** on the landing page for instant access — no signup required.

---

## What This Is

Banks want to catch fraud using AI, but they can't freely share customer transaction data with each other due to privacy laws and competitive concerns. This means each bank is often stuck training a fraud model alone, on limited data, which produces weaker results.

**FedXplain** solves this two ways:

1. **Federated Learning** — multiple simulated banks train a shared fraud-detection model together (using FedAvg) without ever sharing raw transaction data with each other or a central server.
2. **Explainable AI** — every fraud prediction comes with a SHAP-based feature breakdown and an LLM-generated narrative (plain-English for analysts, formal Basel III-style audit narratives for compliance), so decisions are never a black box.

This project is grounded in and directly extends the open research gap identified in:
> N. J. Sarna et al., *"AI Driven Fraud Detection Models in Financial Networks: A Comprehensive Systematic Review,"* IEEE Access, vol. 13, pp. 141204–141233, 2025.

---

## Features

- **Real-time fraud scoring** using a production-grade XGBoost model
- **Federated Learning research module** (FedAvg across 5 simulated banks, non-IID data) as a privacy-preserving comparison baseline
- **Explainable AI** — SHAP feature attribution + Groq LLaMA narratives (plain-English and Basel III audit styles)
- **Batch CSV prediction** — score many transactions at once, export results
- **JWT authentication** with role-based access control (Admin / Fraud Analyst / Auditor)
- **One-click demo login** — try the full app instantly, no registration needed
- **Real-time WebSocket fraud alerts** + email notification hooks
- **Model versioning** — train, register, and safely activate new model versions
- **Full audit logging** for regulatory compliance
- **Premium, editorial-style React frontend** — landing page, live dashboard, prediction workflows, transaction explorer

---

## Tech Stack

**Backend:** Python, FastAPI, scikit-learn, XGBoost, SHAP, SQLAlchemy, JWT (python-jose), Groq API, pytest, Docker
**Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion, TanStack Query, Recharts, React Hook Form + Zod
**Deployment:** Backend on Render, Frontend on Vercel

---

## Repository Structure

```
FedXplain/
├── backend/          FastAPI application, federated learning pipeline, model training
│   ├── app/          API routes, services (SHAP, LLM, model serving), auth, DB models
│   ├── federated/    FedAvg federated learning implementation
│   ├── evaluation/   XGBoost training + baseline comparison scripts
│   ├── data/          Dataset partitioning across simulated banks
│   ├── models_store/ Trained model artifacts (versioned)
│   └── tests/        pytest test suite
│
└── frontend/         React + TypeScript application
    └── src/
        ├── pages/          Route-level pages (Dashboard, Predictions, Explainability, etc.)
        ├── components/     Reusable UI components, organized by feature
        ├── services/       API client layer (typed, one file per backend resource)
        ├── contexts/       Auth context (JWT handling, RBAC)
        └── types/          TypeScript types matching backend schemas exactly
```

---

## Running Locally

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Download the real dataset from Kaggle ([Credit Card Fraud Detection](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud)) and place it at `data/raw/creditcard.csv`.

```bash
PYTHONPATH=. python3 federated/partition_data.py
PYTHONPATH=. python3 federated/train_federated.py
PYTHONPATH=. python3 evaluation/train_xgboost.py
PYTHONPATH=. python3 app/bootstrap_model.py
uvicorn app.main:app --reload --port 8000
```

Copy `.env.example` to `.env` and set at minimum `JWT_SECRET_KEY` (generate with `openssl rand -hex 32`) and `GROQ_API_KEY` (from [console.groq.com](https://console.groq.com)) for real LLM-generated narratives — without it, the app falls back to template-based explanations automatically.

API docs available at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`, proxying API requests to `http://localhost:8000` in development.

### Tests

```bash
cd backend
PYTHONPATH=. pytest tests/ -v
```

---

## Architecture Notes

**Why two models (federated logistic regression *and* XGBoost)?**
The federated model is the privacy-preserving research contribution — proving banks can collaboratively improve fraud detection without centralizing raw data. XGBoost is the production scoring engine actually serving live predictions, since tree ensembles significantly outperform linear models on tabular fraud data (consistent with the broader literature). Federating tree ensembles is a harder, separately-researched problem intentionally kept out of this project's scope.

**Why hand-rolled FedAvg instead of the `flwr` library?**
Algorithmically identical for this model type, but avoids a heavy dependency chain and keeps every step of the aggregation fully explainable and inspectable.

**Dataset:** [Kaggle Credit Card Fraud Detection dataset](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud) — 284,807 real, anonymized European card transactions, ~0.17% fraud rate. Not included in this repo (too large); see setup instructions above.

---

## Author

**Ahsan Mohamed**
[GitHub](https://github.com/ahsan-mohamed) · [LinkedIn](https://linkedin.com/in/ahsan-mohamed-17515a2a5)

Final-year B.E. Computer Science & Engineering (AI/ML), Loyola Institute of Technology and Science, Nagercoil.
