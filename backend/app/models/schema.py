"""
schema.py

Pydantic models defining the shape of every request/response body.
FastAPI uses these to auto-generate the Swagger/OpenAPI docs and to
validate incoming requests before your route code ever runs.
"""

from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel, EmailStr, Field


# ---------- Auth ----------

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: Optional[str] = None
    role: str = Field(default="fraud_analyst", pattern="^(admin|fraud_analyst|auditor)$")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str]
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Prediction ----------

class TransactionInput(BaseModel):
    """Matches the schema of the federated model's training features:
    Time, V1-V28, Amount."""
    Time: float
    V: list[float] = Field(min_length=28, max_length=28, description="V1..V28")
    Amount: float


class PredictionResult(BaseModel):
    transaction_id: int
    fraud_probability: float
    is_fraud_predicted: bool
    model_version: str
    created_at: datetime

    class Config:
        from_attributes = True


class BatchUploadResult(BaseModel):
    batch_id: str
    total_rows: int
    flagged_fraud_count: int
    results: list[PredictionResult]


# ---------- Explanation ----------

class ExplanationOut(BaseModel):
    transaction_id: int
    top_features: list[dict]
    llm_narrative: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Model versioning ----------

class ModelVersionOut(BaseModel):
    version_tag: str
    metrics: Optional[dict]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- WebSocket alerts ----------

class FraudAlert(BaseModel):
    transaction_id: int
    fraud_probability: float
    model_version: str
    message: str
    timestamp: datetime
