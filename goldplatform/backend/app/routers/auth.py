import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from .. import schemas as s
from ..config import settings
from ..db import get_db
from ..deps import COOKIE, current_user
from ..models import (AuditLog, ExpertProfile, PasswordReset, ResearcherProfile,
                      Role, User, Verification)
from ..notify import send_email, send_sms
from ..security import (phone_variants, hash_password, hash_reset, make_token, new_reset_token,
                        password_problem, verify_password)

router = APIRouter(prefix="/api/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)
log = logging.getLogger("auth")


def bad():
    return HTTPException(401, "Those details don't match an account. Check them and try again.")


def audit(db, request, action, user=None, detail=None):
    db.add(AuditLog(user_id=user.id if user else None, action=action, detail=detail,
                    ip=request.client.host if request.client else None))


def out(u: User) -> dict:
    v = u.expert.verification.value if u.expert else None
    return s.UserOut(id=u.id, role=u.role.value, username=u.username, full_name=u.full_name,
                     email=u.email, language=u.language, verification=v).model_dump()


def start_session(resp: Response, user: User, remember: bool):
    token, ttl = make_token(user.id, remember)
    resp.set_cookie(COOKIE, token, max_age=ttl if remember else None, httponly=True,
                    secure=settings.cookie_secure, samesite="lax", path="/")


def check_pw(pw, confirm, role):
    if pw != confirm: raise HTTPException(422, "Passwords do not match.")
    if (p := password_problem(pw, role)): raise HTTPException(422, p)


def taken(db, *, username=None, email=None):
    if username and db.scalar(select(User.id).where(func.lower(User.username) == username.lower())):
        raise HTTPException(409, "That username is already taken.")
    if email and db.scalar(select(User.id).where(func.lower(User.email) == email.lower())):
        raise HTTPException(409, "An account with that email already exists.")


@router.post("/register/miner", status_code=201)
@limiter.limit("10/hour")
def register_miner(request: Request, body: s.MinerRegister, response: Response, db: Session = Depends(get_db)):
    check_pw(body.password, body.confirm_password, "miner"); taken(db, username=body.username)
    u = User(role=Role.miner, username=body.username, phone=body.phone, password_hash=hash_password(body.password))
    db.add(u); db.flush(); audit(db, request, "register", u); db.commit()
    start_session(response, u, False); return out(u)


@router.post("/register/expert", status_code=201)
@limiter.limit("10/hour")
def register_expert(request: Request, body: s.ExpertRegister, response: Response, db: Session = Depends(get_db)):
    check_pw(body.password, body.confirm_password, "expert"); taken(db, email=body.email)
    if db.scalar(select(ExpertProfile.user_id).where(func.lower(ExpertProfile.eia_licence_no) == body.eia_licence_no.lower())):
        raise HTTPException(409, "That EIA licence number is already registered.")
    u = User(role=Role.expert, full_name=body.full_name, email=body.email, phone=body.phone,
             password_hash=hash_password(body.password))
    u.expert = ExpertProfile(firm_name=body.firm_name, location=body.location, county=body.county,
                             eia_licence_no=body.eia_licence_no, qualifications=body.qualifications,
                             expertise=body.expertise, years_experience=body.years_experience)
    db.add(u); db.flush(); audit(db, request, "register", u); db.commit()
    start_session(response, u, False); return out(u)   # stays "pending" until an admin verifies the licence


@router.post("/register/researcher", status_code=201)
@limiter.limit("10/hour")
def register_researcher(request: Request, body: s.ResearcherRegister, response: Response, db: Session = Depends(get_db)):
    check_pw(body.password, body.confirm_password, "researcher"); taken(db, email=body.email)
    u = User(role=Role.researcher, full_name=body.full_name, email=body.email, phone=body.phone, password_hash=hash_password(body.password))
    u.researcher = ResearcherProfile(institution=body.institution, discipline=body.discipline,
                                     interests=body.interests, county=body.county)
    db.add(u); db.flush(); audit(db, request, "register", u); db.commit()
    start_session(response, u, False); return out(u)


@router.post("/login")
@limiter.limit("8/minute")
def login(request: Request, body: s.Login, response: Response, db: Session = Depends(get_db)):
    ident = body.identifier.strip().lower()
    q = select(User).where(User.role == Role(body.role))
    if body.role == "miner":
        q = q.where(func.lower(User.username) == ident)
    else:  # email, or full name when it identifies exactly one account
        q = q.where((func.lower(User.email) == ident) | (func.lower(User.full_name) == ident))
    matches = db.scalars(q.limit(2)).all()
    user = matches[0] if len(matches) == 1 else None
    ok = verify_password(body.password, user.password_hash if user else None)
    if not (user and ok and user.is_active):
        audit(db, request, "login_failed", detail=ident[:60]); db.commit(); raise bad()
    if user.expert and user.expert.verification == Verification.suspended:
        raise HTTPException(403, "This account is suspended. Contact support.")
    audit(db, request, "login", user); db.commit()
    start_session(response, user, body.remember); return out(user)


@router.get("/me")
def me(user: User = Depends(current_user)):
    return out(user)


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE, path="/"); return {"ok": True}


@router.post("/forgot-password")
@limiter.limit("5/hour")
def forgot(request: Request, body: s.Forgot, db: Session = Depends(get_db)):
    """Reset by email OR phone number. The reply is identical whether or not an account matches."""
    user, channel = None, None
    if body.email:
        channel = "email"; user = db.scalar(select(User).where(func.lower(User.email) == body.email.lower()))
    elif body.phone:
        channel = "phone"; found = db.scalars(select(User).where(User.phone.in_(phone_variants(body.phone))).limit(2)).all()
        user = found[0] if len(found) == 1 else None   # if a number is shared by two accounts, no reset is sent
    else:
        raise HTTPException(422, "Enter your email address or your phone number.")
    if user and user.is_active:
        raw, h = new_reset_token()
        db.add(PasswordReset(user_id=user.id, token_hash=h, expires_at=datetime.now(timezone.utc) + timedelta(minutes=30)))
        db.commit()
        link = f"{settings.frontend_origin}/reset?token={raw}"
        sent = (send_email(user.email, "Reset your password", f"Open this link within 30 minutes to set a new password:\n{link}\n\nIf you did not ask for this, ignore this message.")
                if channel == "email" else send_sms(user.phone, f"Reset your password within 30 minutes: {link}"))
        if not sent:
            log.warning("Reset requested but %s delivery is not configured or failed.", channel)
            if not settings.cookie_secure: log.warning("DEV reset link: %s", link)   # development only
    return {"message": "If an account matches, a reset link has been sent."}


@router.post("/reset-password")
@limiter.limit("10/hour")
def reset(request: Request, body: s.Reset, db: Session = Depends(get_db)):
    pr = db.scalar(select(PasswordReset).where(PasswordReset.token_hash == hash_reset(body.token)))
    if not pr or pr.used or pr.expires_at < datetime.now(timezone.utc):
        raise HTTPException(400, "This reset link is invalid or has expired. Request a new one.")
    user = db.get(User, pr.user_id)
    if (p := password_problem(body.password, user.role.value)): raise HTTPException(422, p)
    user.password_hash = hash_password(body.password); pr.used = True
    audit(db, request, "password_reset", user); db.commit()
    return {"message": "Password updated. You can sign in now."}


@router.post("/change-password")
def change_password(request: Request, body: s.ChangePassword, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not verify_password(body.current_password, user.password_hash): raise HTTPException(400, "Current password is incorrect.")
    if (p := password_problem(body.new_password, user.role.value)): raise HTTPException(422, p)
    user.password_hash = hash_password(body.new_password); audit(db, request, "password_change", user); db.commit()
    return {"message": "Password changed."}
