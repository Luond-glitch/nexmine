import re
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from ..db import get_db
from ..deps import current_user, require_roles
from ..models import AuditLog, Notification, Role, Story, StoryComment, StoryReport, User
from .consult import notify

router = APIRouter(prefix="/api/stories", tags=["stories"])
admin = APIRouter(prefix="/api/admin/stories", tags=["admin"])
CATS = ["Personal experience", "Research finding", "Environmental observation", "Community challenge", "Success story",
        "Rehabilitation experience", "Lesson learned"]
PHONE = re.compile(r"\d[\d\s-]{7,}\d")


def clean(*texts):   # privacy: no phone numbers in public posts
    if any(t and PHONE.search(t) for t in texts):
        raise HTTPException(422, "Please remove phone numbers and other personal contact details.")


def name(u: User) -> str:
    return u.username or u.full_name or "Member"


class NewStory(BaseModel):
    title: str = Field(min_length=5, max_length=120)
    body: str = Field(min_length=30, max_length=5000)
    category: str
    location: str | None = Field(None, max_length=120)
    anonymous: bool = False


class NewComment(BaseModel):
    body: str = Field(min_length=2, max_length=1000)


class Report(BaseModel):
    reason: str = Field(min_length=3, max_length=300)


class Decision(BaseModel):
    status: Literal["approved", "rejected"]
    note: str | None = Field(None, max_length=500)


def card(s: Story, db: Session, full=False):
    a = db.get(User, s.author_id)
    d = {"id": s.id, "title": s.title, "category": s.category, "location": s.location, "status": s.status, "note": s.moderator_note,
         "author": "Anonymous" if s.anonymous else name(a), "role": None if s.anonymous else a.role.value,
         "created": s.created_at.isoformat() if s.created_at else None,
         "comments": db.scalar(select(func.count()).select_from(StoryComment).where(StoryComment.story_id == s.id)),
         "excerpt": s.body[:220] + ("…" if len(s.body) > 220 else "")}
    if full:
        d["body"] = s.body
        d["thread"] = [{"id": c.id, "author": name(db.get(User, c.author_id)), "body": c.body, "at": c.created_at.isoformat()}
                       for c in db.scalars(select(StoryComment).where(StoryComment.story_id == s.id).order_by(StoryComment.id)).all()]
    return d


@router.get("/categories")
def categories(_: User = Depends(current_user)):
    return CATS


@router.get("")
def feed(_: User = Depends(current_user), db: Session = Depends(get_db)):   # approved stories, visible in all three portals
    return [card(s, db) for s in db.scalars(select(Story).where(Story.status == "approved").order_by(Story.id.desc()).limit(100)).all()]


@router.get("/mine")
def mine(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [card(s, db) for s in db.scalars(select(Story).where(Story.author_id == user.id).order_by(Story.id.desc())).all()]


@router.post("", status_code=201)
def create(body: NewStory, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role == Role.admin: raise HTTPException(403, "Administrators moderate stories rather than submit them.")
    if body.category not in CATS: raise HTTPException(422, "Choose a category from the list.")
    clean(body.title, body.body, body.location)
    s = Story(author_id=user.id, title=body.title.strip(), body=body.body.strip(), category=body.category,
              location=(body.location or "").strip() or None, anonymous=body.anonymous)
    db.add(s); db.commit(); return card(s, db)   # starts as pending: nothing is public until a moderator approves it


@router.get("/{sid}")
def read(sid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = db.get(Story, sid)
    if not s or (s.status != "approved" and s.author_id != user.id and user.role != Role.admin): raise HTTPException(404, "Story not found.")
    return card(s, db, full=True)


@router.post("/{sid}/comments", status_code=201)
def comment(sid: int, body: NewComment, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = db.get(Story, sid)
    if not s or s.status != "approved": raise HTTPException(404, "Story not found.")
    clean(body.body)
    db.add(StoryComment(story_id=sid, author_id=user.id, body=body.body.strip()))
    if s.author_id != user.id: notify(db, s.author_id, f'New comment on your story "{s.title[:60]}"')
    db.commit(); return card(s, db, full=True)


@router.post("/{sid}/report")
def report(sid: int, body: Report, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = db.get(Story, sid)
    if not s or s.status != "approved": raise HTTPException(404, "Story not found.")
    db.add(StoryReport(story_id=sid, reporter_id=user.id, reason=body.reason.strip()))
    for uid in db.scalars(select(User.id).where(User.role == Role.admin)).all(): notify(db, uid, f'A story was reported: "{s.title[:60]}"')
    db.commit(); return {"ok": True}


@admin.get("")
def admin_list(status: str = "pending", _: User = Depends(require_roles(Role.admin)), db: Session = Depends(get_db)):
    q = select(Story).order_by(Story.id.desc())
    if status != "all": q = q.where(Story.status == status)
    out = []
    for s in db.scalars(q).all():
        d = card(s, db, full=True); d["body"] = s.body
        d["real_author"] = name(db.get(User, s.author_id))   # moderators see the true author even for anonymous posts
        d["reports"] = db.scalar(select(func.count()).select_from(StoryReport).where(StoryReport.story_id == s.id))
        out.append(d)
    return out


@admin.post("/{sid}/decide")
def admin_decide(sid: int, body: Decision, admin_user: User = Depends(require_roles(Role.admin)), db: Session = Depends(get_db)):
    s = db.get(Story, sid)
    if not s: raise HTTPException(404, "Story not found.")
    s.status, s.moderator_note = body.status, body.note
    notify(db, s.author_id, f'Your story "{s.title[:60]}" was {body.status}.' + (f" Note: {body.note}" if body.note else ""))
    db.add(AuditLog(user_id=admin_user.id, action=f"story_{body.status}", detail=f"story {sid}"))
    db.commit(); return {"id": sid, "status": s.status}
