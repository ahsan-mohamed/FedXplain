"""
main.py

Application entrypoint. Run with:
    uvicorn app.main:app --reload --port 8000

Swagger docs auto-generated at /docs (Swagger UI) and /redoc (ReDoc).
"""

import time
import uuid
import pickle
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging_config import setup_logging, get_logger
from app.db.db_models import init_db, SessionLocal
from app.services.model_service import model_service, register_new_version
from app.services.shap_service import shap_service

from app.api.routes_auth import router as auth_router
from app.api.routes_predict import router as predict_router
from app.api.routes_explain import router as explain_router
from app.api.routes_websocket import router as ws_router
from app.api.routes_audit import router as audit_router

setup_logging()
logger = get_logger(__name__)

app = FastAPI(
    title="FedXplain API",
    description=(
        "Privacy-preserving, explainable fraud detection API. "
        "Federated learning across simulated banks + SHAP/LLM explanations, "
        "with JWT auth, RBAC, real-time alerts, and full audit logging."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Request logging + request ID middleware ----------

@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    start_time = time.time()

    try:
        response = await call_next(request)
    except Exception as exc:
        logger.error(f"[{request_id}] Unhandled exception on {request.method} "
                      f"{request.url.path}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error", "request_id": request_id},
        )

    duration_ms = (time.time() - start_time) * 1000
    logger.info(
        f"[{request_id}] {request.method} {request.url.path} "
        f"-> {response.status_code} ({duration_ms:.1f}ms)"
    )
    response.headers["X-Request-ID"] = request_id
    return response


# ---------- Startup ----------

@app.on_event("startup")
def on_startup():
    logger.info(f"Starting {settings.APP_NAME} ({settings.ENV})")
    init_db()

    db = SessionLocal()
    try:
        # Auto-bootstrap: on a fresh deploy, the DB starts empty (fedxplain.db
        # is gitignored) but the trained model .pkl files ARE committed to
        # the repo. Without this, a fresh container has a model file on disk
        # but no ModelVersion row marking anything "active", so /predict
        # would 503 even though the model is right there. This self-heals
        # that gap automatically on startup, rather than requiring someone
        # to SSH in and run bootstrap_model.py manually on every deploy.
        from app.db.db_models import ModelVersion
        has_active = db.query(ModelVersion).filter(ModelVersion.is_active.is_(True)).first()

        if not has_active:
            xgb_path = Path(settings.MODEL_STORE_DIR) / "xgboost_model.pkl"
            if xgb_path.exists():
                logger.info("No active model in DB but xgboost_model.pkl found on disk -- "
                            "auto-registering it as the active model version.")
                with open(xgb_path, "rb") as f:
                    xgb_payload = pickle.load(f)
                register_new_version(db, xgb_payload, activate=True)
            else:
                logger.warning(
                    "No active model in DB and no xgboost_model.pkl found on disk. "
                    "Train the model (evaluation/train_xgboost.py) and ensure "
                    "models_store/ is included in this deployment."
                )

        # Load whatever model version is now marked active, if any.
        model_service.load_active(db)
        model_service.load_federated_comparison_model()
    finally:
        db.close()

    if not model_service.is_ready():
        logger.warning(
            "No active model loaded at startup. Train the XGBoost model "
            "(evaluation/train_xgboost.py) and run app/bootstrap_model.py "
            "before predictions will work."
        )

    # SHAP explainer piggybacks on the same XGBoost artifact
    shap_service.load()
    if not shap_service.is_ready():
        logger.warning("SHAP explainer not loaded -- /explain endpoints will 503 until "
                         "evaluation/train_xgboost.py has been run.")


# ---------- Health & monitoring ----------

@app.get("/health", tags=["Monitoring"])
def health_check():
    return {
        "status": "ok",
        "model_loaded": model_service.is_ready(),
        "active_model_version": model_service.version_tag,
    }


# ---------- Routers ----------

app.include_router(auth_router)
app.include_router(predict_router)
app.include_router(explain_router)
app.include_router(ws_router)
app.include_router(audit_router)
