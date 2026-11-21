from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from ..models import Rating
from sqlalchemy.orm import Session, joinedload
from ..db import get_db
from ..deps import current_user, require_roles
from ..models import AuditLog, ExpertExtra, ExpertService, ExpertProfile, Role, User, Verification

router = APIRouter(prefix="/api", tags=["experts"])


@router.get("/experts")   # visible to any signed-in user; only VERIFIED experts; no phone or email exposed
def directory(_: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(ExpertProfile).options(joinedload(ExpertProfile.user))
                      .where(ExpertProfile.verification == Verification.verified)).all()
    rt = {i: (round(float(a), 1), n) for i, a, n in db.execute(select(Rating.expert_id, func.avg(Rating.stars), func.count()).group_by(Rating.expert_id)).all()}
    return [{"rating": rt.get(e.user_id, (None, 0))[0], "rating_count": rt.get(e.user_id, (None, 0))[1],
             "id": e.user_id, "name": e.user.full_name, "firm": e.firm_name, "county": e.county, "location": e.location,
             "licence": e.eia_licence_no, "qualifications": e.qualifications, "expertise": e.expertise,
             "years": e.years_experience, "bio": (db.get(ExpertExtra, e.user_id).bio if db.get(ExpertExtra, e.user_id) else None),
             "availability": (db.get(ExpertExtra, e.user_id).availability if db.get(ExpertExtra, e.user_id) else "available"),
             "services": db.scalars(select(ExpertService.name).where(ExpertService.user_id == e.user_id)).all()} for e in rows]


class Decision(BaseModel):
    status: Verification
    note: str | None = Field(None, max_length=500)


@router.get("/admin/experts")
def admin_list(status: str | None = None, _: User = Depends(require_roles(Role.admin)), db: Session = Depends(get_db)):
    q = select(ExpertProfile, User).join(User, User.id == ExpertProfile.user_id).order_by(User.created_at.desc())
    if status and status != "all":
        try: q = q.where(ExpertProfile.verification == Verification(status))
        except ValueError: raise HTTPException(400, "Unknown status.")
    counts = {v.value: 0 for v in Verification}
    for v, n in db.execute(select(ExpertProfile.verification, func.count()).group_by(ExpertProfile.verification)).all():
        counts[v.value] = n
    items = [{"id": e.user_id, "name": u.full_name, "email": u.email, "phone": u.phone, "firm": e.firm_name,
              "county": e.county, "location": e.location, "licence": e.eia_licence_no, "qualifications": e.qualifications,
              "expertise": e.expertise, "years": e.years_experience, "status": e.verification.value, "note": e.verification_note}
             for e, u in db.execute(q).all()]
    return {"counts": counts, "items": items}


@router.post("/admin/experts/{uid}/status")
def admin_decide(uid: int, body: Decision, admin: User = Depends(require_roles(Role.admin)), db: Session = Depends(get_db)):
    e = db.get(ExpertProfile, uid)
    if not e: raise HTTPException(404, "Expert not found.")
    e.verification, e.verification_note = body.status, body.note
    db.add(AuditLog(user_id=admin.id, action=f"expert_{body.status.value}", detail=f"expert {uid}: {body.note or ''}"))
    db.commit(); return {"id": uid, "status": body.status.value}
