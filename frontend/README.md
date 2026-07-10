# FedXplain — Frontend

React 19 + TypeScript + Vite + Tailwind v4. Consumes the FedXplain FastAPI
backend exactly as implemented — no invented endpoints.

## Setup

```bash
npm install
npm run dev
```

Runs on http://localhost:5173. The Vite dev server proxies /api/* requests
to http://localhost:8000 (your FastAPI backend) -- see vite.config.ts.
Make sure the backend is running first:

```bash
# in a separate terminal, from backend/
uvicorn app.main:app --reload --port 8000
```

## All pages built

| Page | Real backend calls |
|---|---|
| Landing page | — (marketing content) |
| Login / Register | POST /auth/login, POST /auth/register |
| Dashboard | GET /health, GET /audit/transactions |
| Predictions | POST /predict/explained |
| Explainability | GET /explain/{id} |
| Basel III Report | GET /explain/{id}/basel |
| Transactions | GET /audit/transactions |
| Models | GET /models/versions, POST /models/activate/{tag} |
| Audit Logs | GET /audit/logs |
| Settings | GET /health |

Every page above is wired to the real backend, not mocked. Role-based
access is enforced both server-side (backend RBAC) and reflected in the
UI (sidebar hides items the current role can't use, e.g. Transactions
and Audit Logs are Admin/Auditor only).

## Important scope note: no fake fields

The original design brief called for form fields like "Customer Name,"
"Merchant," "Country," "Payment Method," "Device." These do not exist
in the real dataset or backend model -- the Kaggle Credit Card Fraud
dataset is deliberately anonymized to PCA-transformed features (Time,
V1-V28, Amount) specifically so no cardholder, merchant, or location
can be identified. The Predictions page instead lets you generate a
"Typical," "Suspicious pattern," or "Fully random" transaction (or hand-edit
all 28 raw features), clearly labeled as generated/illustrative, not
real historical transactions.

## Auth flow

- JWT access + refresh tokens stored in localStorage
- src/services/client.ts auto-attaches the access token to every request
  and silently retries once via refresh token on a 401
- src/contexts/AuthContext.tsx decodes the JWT client-side to get
  email + role for RBAC-aware UI

## Path alias

@/ maps to src/ (configured in both vite.config.ts and tsconfig.app.json)

## Build

```bash
npm run build
```
Verified working -- builds clean with no TypeScript errors.

## Known non-blocking warning

The production bundle is ~980kB (before gzip: ~294kB), which triggers
Vite's default "chunk size" warning. This does not break anything --
it's a performance suggestion (code-splitting) worth addressing only if
you want extra polish for a production deployment, not required for a
final-year project demo.
