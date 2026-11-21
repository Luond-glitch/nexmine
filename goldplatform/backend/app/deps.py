from fastapi import Cookie, Depends, HTTPException
from sqlalchemy.orm import Session
from .db import get_db
from .models import Role, User, Verification
from .security import read_token

COOKIE = "gp_session"


def current_user(token: str | None = Cookie(None, alias=COOKIE), db: Session = Depends(get_db)) -> User:
    uid = read_token(token) if token else None
    user = db.get(User, uid) if uid else None
    if not user or not user.is_active:
        raise HTTPException(401, "Please sign in.")
    if user.expert and user.expert.verification == Verification.suspended:
        raise HTTPException(403, "This account is suspended. Contact support.")
    return user


def require_roles(*roles: Role):
    def check(user: User = Depends(current_user)) -> User:   # enforced server-side on every protected route
        if user.role not in roles:
            raise HTTPException(403, "You do not have access to this area.")
        return user
    return check


def verified_expert(user: User = Depends(require_roles(Role.expert))) -> User:
    if not user.expert or user.expert.verification != Verification.verified:
        raise HTTPException(403, "Your account is pending verification by the administrator.")
    return user
