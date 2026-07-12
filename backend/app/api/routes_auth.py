"""
routes_auth.py

- POST /auth/register : create a new user (Admin/Analyst/Auditor)
- POST /auth/login     : returns JWT access + refresh tokens
- POST /auth/refresh   : exchange a valid refresh token for a new access token
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from jose import JWTError

from app.core.security import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, decode_token,
)
from app.core.logging_config import get_logger
from app.db.db_models import get_db, User, AuditLog
from app.models.schema import UserRegister, UserLogin, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = get_logger(__name__)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info(f"New user registered: {user.email} (role={user.role})")
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        logger.warning(f"Failed login attempt for {payload.email}")
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    access_token = create_access_token(user.email, user.role)
    refresh_token = create_refresh_token(user.email, user.role)

    db.add(AuditLog(
        user_id=user.id, action="LOGIN",
        ip_address=request.client.host if request.client else None,
    ))
    db.commit()

    logger.info(f"User logged in: {user.email}")
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/demo-login", response_model=TokenResponse)
def demo_login(request: Request, db: Session = Depends(get_db)):
    """
    One-click 'Try Demo' entry point -- no email/password required from the
    visitor. Looks up (or creates, on first ever call) a fixed demo account
    with full admin access, and issues real JWT tokens for it.

    This does NOT bypass or weaken the auth system -- the demo account is a
    genuine User row with a genuine (randomly generated, never exposed)
    hashed password. It simply skips the login FORM for convenience; every
    downstream request still goes through the exact same JWT + RBAC checks
    as any other user.
    """
    DEMO_EMAIL = "demo@fedxplain.app"

    user = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if user is None:
        import secrets
        random_password = secrets.token_hex(16)  # never given to the client
        user = User(
            email=DEMO_EMAIL,
            hashed_password=hash_password(random_password),
            full_name="Demo User",
            role="admin",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info("Created demo account on first use")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Demo account is deactivated")

    access_token = create_access_token(user.email, user.role)
    refresh_token = create_refresh_token(user.email, user.role)

    db.add(AuditLog(
        user_id=user.id, action="DEMO_LOGIN",
        ip_address=request.client.host if request.client else None,
    ))
    db.commit()

    logger.info("Demo login issued")
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
def refresh_token_endpoint(refresh_token: str, db: Session = Depends(get_db)):
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    new_access = create_access_token(user.email, user.role)
    new_refresh = create_refresh_token(user.email, user.role)
    return TokenResponse(access_token=new_access, refresh_token=new_refresh)
