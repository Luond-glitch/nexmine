from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session
from ..db import get_db
from ..deps import current_user, require_roles
from ..models import AuditLog, MapPoint, Role, User
from .consult import notify

router = APIRouter(prefix="/api/map", tags=["map"])
admin = APIRouter(prefix="/api/admin/map", tags=["admin"])
KINDS = {"abandoned_pit": "Abandoned mining pit", "incident": "Environmental incident", "rehabilitation": "Rehabilitation site"}


class NewPoint(BaseModel):
    kind: Literal["abandoned_pit", "incident", "rehabilitation"]
    title: str = Field(min_length=3, max_length=120)
    description: str | None = Field(None, max_length=1000)
    lat: float = Field(ge=-5.5, le=5.5)      # Kenya and surroundings only
    lon: float = Field(ge=33.5, le=42.0)


class Decision(BaseModel):
    status: Literal["approved", "rejected"]


def out(p: MapPoint, exact: bool, mine: bool):
    # Public viewers get coordinates rounded to 2 decimals (about 1 km) so exact mining spots stay confidential.
    return {"id": p.id, "kind": p.kind, "label": KINDS[p.kind], "title": p.title, "description": p.description, "status": p.status,
            "lat": p.lat if exact else round(p.lat, 2), "lon": p.lon if exact else round(p.lon, 2), "exact": exact, "mine": mine}


@router.get("/config")
def config(_: User = Depends(current_user)):
    # Centre is Bondo town. Abimbo's exact boundary is not loaded: it needs an official dataset.
    return {"center": [0.2417, 34.2711], "zoom": 11, "kinds": KINDS}


@router.get("/points")
def points(user: User = Depends(current_user), db: Session = Depends(get_db)):
    q = select(MapPoint).where(or_(MapPoint.status == "approved", MapPoint.user_id == user.id)).order_by(MapPoint.id.desc()).limit(500)
    return [out(p, p.user_id == user.id or user.role == Role.admin, p.user_id == user.id) for p in db.scalars(q).all()]


@router.post("/points", status_code=201)
def add(body: NewPoint, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role == Role.admin: raise HTTPException(403, "Administrators review points rather than add them.")
    p = MapPoint(user_id=user.id, **body.model_dump()); db.add(p); db.commit()
    return out(p, True, True)   # starts pending: only the owner sees it until a moderator approves


@admin.get("")
def admin_list(status: str = "pending", _: User = Depends(require_roles(Role.admin)), db: Session = Depends(get_db)):
    q = select(MapPoint).order_by(MapPoint.id.desc())
    if status != "all": q = q.where(MapPoint.status == status)
    return [out(p, True, False) for p in db.scalars(q).all()]


@admin.post("/{pid}/decide")
def decide(pid: int, body: Decision, a: User = Depends(require_roles(Role.admin)), db: Session = Depends(get_db)):
    p = db.get(MapPoint, pid)
    if not p: raise HTTPException(404, "Not found.")
    p.status = body.status; notify(db, p.user_id, f'Your map point "{p.title[:60]}" was {body.status}.')
    db.add(AuditLog(user_id=a.id, action=f"map_{body.status}", detail=str(pid))); db.commit(); return {"ok": True}
