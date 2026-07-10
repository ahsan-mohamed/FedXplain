"""
config.py

Centralized settings, loaded from environment variables (or a .env file).
Never hardcode secrets -- everything sensitive (JWT secret, SMTP creds,
DB URL) comes from here so it's swappable per environment (dev/staging/prod)
without touching code.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    APP_NAME: str = "FedXplain"
    ENV: str = "development"
    DEBUG: bool = True

    # JWT
    JWT_SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_use_openssl_rand_hex_32"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str = "sqlite:///./fedxplain.db"

    # Email / SMTP (used for fraud alert notifications)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "alerts@fedxplain.local"
    EMAIL_ALERTS_ENABLED: bool = False  # off by default until SMTP creds set

    # Model
    MODEL_STORE_DIR: str = "./models_store"
    FRAUD_ALERT_THRESHOLD: float = 0.85  # probability above which we alert

    # Groq (LLM explanations) -- filled in when explainability layer is added
    GROQ_API_KEY: str = ""

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "./logs/fedxplain.log"

    # Retry policy (external calls: email, LLM)
    MAX_RETRIES: int = 3
    RETRY_BACKOFF_SECONDS: float = 1.5


settings = Settings()
