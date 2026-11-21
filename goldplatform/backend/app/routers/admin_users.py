from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session
from ..db import get_db
from ..deps import require_roles
from ..models import (AiUsage, Attachment, AuditLog, ConsultationRequest, ExpertProfile, MapPoint, Message, Rating, Role, Story, Thread, User)

router = APIRouter(prefix="/api/admin", tags=["admin"])


class Active(BaseModel):
    active: bool


def tally(db, col, *where):
    q = select(col, func.count()).group_by(col)
    for w in where: q = q.where(w)
    return {str(getattr(k, "value", k)): n for k, n in db.execute(q).all()}


@router.get("/analytics")
def analytics(_: User = Depends(require_roles(Role.admin)), db: Session = Depends(get_db)):
    since = datetime.now(timezone.utc) - timedelta(days=30)
    avg = db.scalar(select(func.avg(Rating.stars)))
    return {"users": tally(db, User.role), "inactive_users": db.scalar(select(func.count()).select_from(User).where(User.is_active.is_(False))),
            "experts": tally(db, ExpertProfile.verification), "requests": tally(db, ConsultationRequest.status),
            "stories": tally(db, Story.status), "map_points": tally(db, MapPoint.status),
            "discussions": db.scalar(select(func.count()).select_from(Thread)), "messages": db.scalar(select(func.count()).select_from(Message)),
            "files": db.scalar(select(func.count()).select_from(Attachment)), "average_rating": round(float(avg), 2) if avg else None,
            "ai_30_days": tally(db, AiUsage.provider, AiUsage.created_at >= since)}


@router.get("/users")
def users(role: str | None = None, q: str | None = None, _: User = Depends(require_roles(Role.admin)), db: Session = Depends(get_db)):
    s = select(User).order_by(User.id.desc()).limit(200)
    if role in {r.value for r in Role}: s = s.where(User.role == Role(role))
    if q:
        esc = q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        s = s.where(or_(*[c.ilike(f"%{esc}%", escape="\\") for c in (User.username, User.full_name, User.email, User.phone)]))
    return [{"id": u.id, "role": u.role.value, "name": u.username or u.full_name, "email": u.email, "phone": u.phone, "active": u.is_active,
             "created": u.created_at.isoformat() if u.created_at else None} for u in db.scalars(s).all()]


@router.post("/users/{uid}/active")
def set_active(uid: int, body: Active, a: User = Depends(require_roles(Role.admin)), db: Session = Depends(get_db)):
    u = db.get(User, uid)
    if not u: raise HTTPException(404, "User not found.")
    if u.id == a.id: raise HTTPException(409, "You cannot deactivate your own account.")
    u.is_active = body.active
    db.add(AuditLog(user_id=a.id, action="user_activate" if body.active else "user_deactivate", detail=f"user {uid}")); db.commit()
    return {"id": uid, "active": u.is_active}


@router.get("/audit")
def audit(_: User = Depends(require_roles(Role.admin)), db: Session = Depends(get_db)):
    return [{"id": r.id, "action": r.action, "detail": r.detail, "user_id": r.user_id, "ip": r.ip, "at": r.created_at.isoformat() if r.created_at else None}
            for r in db.scalars(select(AuditLog).order_by(AuditLog.id.desc()).limit(80)).all()]
