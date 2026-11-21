from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from ..db import get_db
from ..deps import current_user, require_roles
from ..library_data import RESEARCH
from ..models import AuditLog, Reply, Resource, Role, Thread, User
from .stories import clean, name

router = APIRouter(prefix="/api/discuss", tags=["discuss"])
res = APIRouter(prefix="/api/resources", tags=["resources"])
admin = APIRouter(prefix="/api/admin", tags=["admin"])
TOPICS = ["General", "Research question", "Field methods", "Policy and law", "Rehabilitation", "Water and soil", "Collaboration"]


class NewThread(BaseModel):
    title: str = Field(min_length=5, max_length=140)
    body: str = Field(min_length=20, max_length=4000)
    topic: str


class NewReply(BaseModel):
    body: str = Field(min_length=2, max_length=2000)


class NewResource(BaseModel):
    title: str = Field(min_length=5, max_length=200)
    issuer: str = Field(min_length=2, max_length=160)
    category: str = Field(min_length=2, max_length=40)
    url: str = Field(max_length=500, pattern=r"^https://")
    summary: str | None = Field(None, max_length=400)


def card(t: Thread, db: Session, full=False):
    a = db.get(User, t.author_id)
    d = {"id": t.id, "title": t.title, "topic": t.topic, "author": name(a), "role": a.role.value, "created": t.created_at.isoformat(),
         "replies": db.scalar(select(func.count()).select_from(Reply).where(Reply.thread_id == t.id))}
    if full:
        d["body"] = t.body
        d["thread"] = [{"id": r.id, "author": name(db.get(User, r.author_id)), "body": r.body, "at": r.created_at.isoformat()}
                       for r in db.scalars(select(Reply).where(Reply.thread_id == t.id).order_by(Reply.id)).all()]
    return d


@router.get("/topics")
def topics(_: User = Depends(current_user)):
    return TOPICS


@router.get("")
def threads(_: User = Depends(current_user), db: Session = Depends(get_db)):
    return [card(t, db) for t in db.scalars(select(Thread).where(Thread.hidden.is_(False)).order_by(Thread.id.desc()).limit(100)).all()]


@router.post("", status_code=201)
def create(body: NewThread, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role == Role.admin: raise HTTPException(403, "Use a member account to post.")
    if body.topic not in TOPICS: raise HTTPException(422, "Choose a topic from the list.")
    clean(body.title, body.body)
    t = Thread(author_id=user.id, title=body.title.strip(), body=body.body.strip(), topic=body.topic)
    db.add(t); db.commit(); return card(t, db)


def _t(db, tid):
    t = db.get(Thread, tid)
    if not t or t.hidden: raise HTTPException(404, "Discussion not found.")
    return t


@router.get("/{tid}")
def read(tid: int, _: User = Depends(current_user), db: Session = Depends(get_db)):
    return card(_t(db, tid), db, full=True)


@router.post("/{tid}/replies", status_code=201)
def reply(tid: int, body: NewReply, user: User = Depends(current_user), db: Session = Depends(get_db)):
    t = _t(db, tid); clean(body.body)
    db.add(Reply(thread_id=tid, author_id=user.id, body=body.body.strip())); db.commit()
    return card(t, db, full=True)


@res.get("")
def resources(_: User = Depends(current_user), db: Session = Depends(get_db)):
    extra = [{"id": r.id, "title": r.title, "issuer": r.issuer, "category": r.category, "url": r.url, "summary": r.summary, "added": True}
             for r in db.scalars(select(Resource).order_by(Resource.id.desc())).all()]
    return extra + [{**r, "id": None, "added": False} for r in RESEARCH]


@admin.post("/resources", status_code=201)
def add_resource(body: NewResource, a: User = Depends(require_roles(Role.admin)), db: Session = Depends(get_db)):
    r = Resource(**body.model_dump()); db.add(r); db.add(AuditLog(user_id=a.id, action="resource_add", detail=body.title[:100])); db.commit()
    return {"id": r.id}


@admin.delete("/resources/{rid}")
def del_resource(rid: int, a: User = Depends(require_roles(Role.admin)), db: Session = Depends(get_db)):
    r = db.get(Resource, rid)
    if not r: raise HTTPException(404, "Not found.")
    db.delete(r); db.add(AuditLog(user_id=a.id, action="resource_delete", detail=str(rid))); db.commit(); return {"ok": True}


@admin.post("/discuss/{tid}/hide")
def hide(tid: int, a: User = Depends(require_roles(Role.admin)), db: Session = Depends(get_db)):
    t = db.get(Thread, tid)
    if not t: raise HTTPException(404, "Not found.")
    t.hidden = True; db.add(AuditLog(user_id=a.id, action="thread_hide", detail=str(tid))); db.commit(); return {"ok": True}
