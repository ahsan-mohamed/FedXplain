"""
deps.py

FastAPI dependency functions:
  - get_current_user   : decodes the JWT from the Authorization header,
                          loads the corresponding User from the DB
  - require_role(...)  : returns a dependency that only lets requests
                          through if the current user's role is in the
                          allowed set -- this is the RBAC enforcement point

Usage in a route:
    @router.get("/admin-only")
    def admin_route(user: User = Depends(require_role(Role.ADMIN))):
        ...
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_token, Role
from app.db.db_models import get_db, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise credentials_exception
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def require_role(*allowed_roles: Role):
    def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in [r.value for r in allowed_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' is not permitted to perform this action. "
                       f"Requires one of: {[r.value for r in allowed_roles]}",
            )
        return user
    return role_checker
