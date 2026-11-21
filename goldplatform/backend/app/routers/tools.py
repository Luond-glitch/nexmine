import json
from datetime import date
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..db import get_db
from ..deps import current_user
from ..library_data import CHECKLIST
from ..models import ChecklistResult, RehabRecord, User

router = APIRouter(prefix="/api/tools", tags=["tools"])
IDS = {i["id"] for g in CHECKLIST for i in g["items"]}


class Answers(BaseModel):
    answers: dict[str, Literal["yes", "no", "unsure"]]


def score(a: dict):
    n = len(IDS); yes = sum(1 for k, v in a.items() if k in IDS and v == "yes")
    return {"yes": yes, "total": n, "percent": round(100 * yes / n), "to_work_on": sum(1 for k, v in a.items() if k in IDS and v != "yes") + (n - len([k for k in a if k in IDS]))}


@router.get("/checklist")
def get_checklist(user: User = Depends(current_user), db: Session = Depends(get_db)):
    r = db.get(ChecklistResult, user.id); a = json.loads(r.answers) if r else {}
    return {"groups": CHECKLIST, "answers": a, "updated": r.updated_at.isoformat() if r and r.updated_at else None, "score": score(a)}


@router.put("/checklist")
def put_checklist(body: Answers, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not set(body.answers) <= IDS: raise HTTPException(422, "Unknown checklist item.")
    r = db.get(ChecklistResult, user.id) or ChecklistResult(user_id=user.id, answers="{}")
    r.answers = json.dumps(body.answers); db.add(r); db.commit()
    return {"score": score(body.answers)}


class RehabIn(BaseModel):
    activity: str = Field(min_length=3, max_length=120)
    description: str | None = Field(None, max_length=1500)
    area: str | None = Field(None, max_length=120)
    status: Literal["planned", "in_progress", "done"] = "planned"
    activity_date: date


class StatusIn(BaseModel):
    status: Literal["planned", "in_progress", "done"]


def rec(r: RehabRecord):
    return {"id": r.id, "activity": r.activity, "description": r.description, "area": r.area, "status": r.status, "date": r.activity_date.isoformat()}


@router.get("/rehab")
def rehab_list(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [rec(r) for r in db.scalars(select(RehabRecord).where(RehabRecord.user_id == user.id).order_by(RehabRecord.activity_date.desc(), RehabRecord.id.desc())).all()]


@router.post("/rehab", status_code=201)
def rehab_add(body: RehabIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    r = RehabRecord(user_id=user.id, **body.model_dump()); db.add(r); db.commit(); return rec(r)


@router.patch("/rehab/{rid}")
def rehab_status(rid: int, body: StatusIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    r = db.get(RehabRecord, rid)
    if not r or r.user_id != user.id: raise HTTPException(404, "Record not found.")
    r.status = body.status; db.commit(); return rec(r)


@router.delete("/rehab/{rid}")
def rehab_delete(rid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    r = db.get(RehabRecord, rid)
    if not r or r.user_id != user.id: raise HTTPException(404, "Record not found.")
    db.delete(r); db.commit(); return {"ok": True}
