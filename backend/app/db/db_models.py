"""
db_models.py

SQLAlchemy ORM models. Using SQLite by default (zero-config, file-based --
good for a final-year project demo); DATABASE_URL in config.py can be
swapped to Postgres for production with no code changes (SQLAlchemy
handles the dialect differences).

Tables:
  - User            : accounts + role (admin / fraud_analyst / auditor)
  - Transaction      : every transaction ever scored, with prediction
  - Explanation      : SHAP + LLM explanation tied to a transaction
  - AuditLog         : who did what, when -- required for regulatory
                        compliance (this is literally one of the paper's
                        "Legal and Ethical Considerations" -- accountability)
  - ModelVersion     : registry of trained federated model versions
"""

from datetime import datetime, timezone

from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Boolean,
    DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, nullable=False, default="fraud_analyst")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    features = Column(JSON, nullable=False)          # raw input features
    fraud_probability = Column(Float, nullable=False)
    is_fraud_predicted = Column(Boolean, nullable=False)
    model_version = Column(String, nullable=False)
    batch_id = Column(String, nullable=True, index=True)  # groups CSV batch uploads
    created_at = Column(DateTime, default=utcnow)

    explanation = relationship("Explanation", back_populates="transaction", uselist=False)


class Explanation(Base):
    __tablename__ = "explanations"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False)
    shap_values = Column(JSON, nullable=False)
    top_features = Column(JSON, nullable=False)
    llm_narrative = Column(Text, nullable=True)          # plain-English (dashboard)
    llm_narrative_basel = Column(Text, nullable=True)    # Basel III-style (audit/compliance)
    created_at = Column(DateTime, default=utcnow)

    transaction = relationship("Transaction", back_populates="explanation")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)           # e.g. "PREDICT", "LOGIN", "CSV_UPLOAD"
    detail = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=utcnow)


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True)
    version_tag = Column(String, unique=True, nullable=False)   # e.g. "v1.0.0"
    file_path = Column(String, nullable=False)
    metrics = Column(JSON, nullable=True)              # accuracy/f1/auc at training time
    is_active = Column(Boolean, default=False)          # only one should be active at a time
    created_at = Column(DateTime, default=utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
