import re
from datetime import datetime, timedelta
from typing import Literal
from urllib.parse import quote
from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session
from ..db import get_db
from ..deps import current_user, require_roles, verified_expert
from ..models import (Appointment, Attachment, ConsultationRequest as CR, ExpertProfile, ExpertWhatsApp, Message, Notification, Rating, Role, User, Verification)
from ..security import normalize_phone

router = APIRouter(prefix="/api/consult", tags=["consult"])
notes = APIRouter(prefix="/api/notifications", tags=["notifications"])
SERVICES = ["I want to start gold mining", "Environmental Impact Assessment", "Environmental compliance guidance",
            "Mine rehabilitation", "Environmental auditing", "Waste management advice", "Water quality assessment", "Other"]


def notify(db, uid, text):
    db.add(Notification(user_id=uid, text=text[:240]))


def card(r: CR, db: Session, viewer: User) -> dict:
    expert = db.get(User, r.expert_id) if r.expert_id else None
    miner = db.get(User, r.miner_id)
    ep = expert.expert if expert else None
    return {"id": r.id, "ref": r.ref, "service": r.service_type, "location": r.location, "description": r.description,
            "status": r.status, "created": r.created_at.isoformat() if r.created_at else None,
            "directed": r.target_expert_id is not None,
            "expert": {"name": expert.full_name, "firm": ep.firm_name if ep else None} if expert else None,
            # miners stay pseudonymous: experts only see the username, and only after accepting
            "miner": miner.username if viewer.role == Role.expert and r.expert_id == viewer.id else None,
            "rating": db.scalar(select(Rating.stars).where(Rating.request_id == r.id)),
            "whatsapp": bool(viewer.role == Role.miner and r.status == "accepted" and r.expert_id and (w := db.get(ExpertWhatsApp, r.expert_id)) and w.enabled)}


class NewReq(BaseModel):
    service_type: str
    location: str = Field(min_length=2, max_length=160)
    description: str = Field(min_length=10, max_length=2000)
    target_expert_id: int | None = None


class Msg(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


@router.get("/services")
def services(_: User = Depends(current_user)):
    return SERVICES


@router.post("/requests", status_code=201)
def create(body: NewReq, user: User = Depends(require_roles(Role.miner)), db: Session = Depends(get_db)):
    if body.service_type not in SERVICES: raise HTTPException(422, "Choose a service from the list.")
    if body.target_expert_id:
        ep = db.get(ExpertProfile, body.target_expert_id)
        if not ep or ep.verification != Verification.verified: raise HTTPException(404, "That expert is not available.")
    r = CR(miner_id=user.id, service_type=body.service_type, location=body.location.strip(), description=body.description.strip(),
           target_expert_id=body.target_expert_id)
    db.add(r); db.flush(); r.ref = f"REQ-{r.id:05d}"
    who = [body.target_expert_id] if body.target_expert_id else db.scalars(
        select(ExpertProfile.user_id).where(ExpertProfile.verification == Verification.verified)).all()
    for uid in who: notify(db, uid, f"New consultation request {r.ref}: {r.service_type}")
    db.commit(); return card(r, db, user)


@router.get("/requests/mine")   # miner: own requests; expert: requests they accepted
def mine(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role == Role.miner: q = select(CR).where(CR.miner_id == user.id)
    elif user.role == Role.expert: q = select(CR).where(CR.expert_id == user.id)
    else: raise HTTPException(403, "Not available for your account type.")
    return [card(r, db, user) for r in db.scalars(q.order_by(CR.created_at.desc())).all()]


@router.get("/requests/open")
def open_requests(user: User = Depends(verified_expert), db: Session = Depends(get_db)):
    q = select(CR).where(CR.status == "open", or_(CR.target_expert_id.is_(None), CR.target_expert_id == user.id))
    return [card(r, db, user) for r in db.scalars(q.order_by(CR.created_at.desc())).all()]


def _get(db, rid):
    r = db.get(CR, rid)
    if not r: raise HTTPException(404, "Request not found.")
    return r


@router.post("/requests/{rid}/accept")
def accept(rid: int, user: User = Depends(verified_expert), db: Session = Depends(get_db)):
    r = db.scalar(select(CR).where(CR.id == rid).with_for_update())   # lock: first expert to accept wins
    if not r: raise HTTPException(404, "Request not found.")
    if r.status != "open" or (r.target_expert_id not in (None, user.id)): raise HTTPException(409, "This request is no longer open.")
    r.status, r.expert_id = "accepted", user.id
    notify(db, r.miner_id, f"{user.full_name} accepted your request {r.ref}. You can now message them.")
    db.commit(); return card(r, db, user)


@router.post("/requests/{rid}/decline")
def decline(rid: int, user: User = Depends(verified_expert), db: Session = Depends(get_db)):
    r = _get(db, rid)
    if r.status != "open" or r.target_expert_id != user.id: raise HTTPException(409, "Only a request sent directly to you can be declined.")
    r.status = "declined"; notify(db, r.miner_id, f"Your request {r.ref} was declined. You can send it to another expert.")
    db.commit(); return card(r, db, user)


@router.post("/requests/{rid}/close")
def close(rid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    r = _get(db, rid)
    if user.id not in (r.miner_id, r.expert_id) or r.status != "accepted": raise HTTPException(403, "You cannot close this request.")
    r.status = "closed"; notify(db, r.expert_id if user.id == r.miner_id else r.miner_id, f"Request {r.ref} was marked complete.")
    db.commit(); return card(r, db, user)


def _party(db, rid, user):
    r = _get(db, rid)
    if user.id not in (r.miner_id, r.expert_id): raise HTTPException(403, "This conversation is private.")
    return r


@router.get("/requests/{rid}/messages")
def messages(rid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    _party(db, rid, user)
    rows = db.scalars(select(Message).where(Message.request_id == rid).order_by(Message.id)).all()
    return [{"id": m.id, "mine": m.sender_id == user.id, "body": m.body, "at": m.created_at.isoformat()} for m in rows]


@router.post("/requests/{rid}/messages", status_code=201)
def send(rid: int, body: Msg, user: User = Depends(current_user), db: Session = Depends(get_db)):
    r = _party(db, rid, user)
    if r.status != "accepted": raise HTTPException(409, "This conversation is closed.")
    db.add(Message(request_id=rid, sender_id=user.id, body=body.body.strip()))
    notify(db, r.expert_id if user.id == r.miner_id else r.miner_id, f"New message on {r.ref}")
    db.commit(); return {"ok": True}


@notes.get("")
def list_notes(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(Notification).where(Notification.user_id == user.id).order_by(Notification.id.desc()).limit(40)).all()
    return {"unread": sum(1 for n in rows if not n.read),
            "items": [{"id": n.id, "text": n.text, "read": n.read, "at": n.created_at.isoformat()} for n in rows]}


@notes.post("/read")
def mark_read(user: User = Depends(current_user), db: Session = Depends(get_db)):
    for n in db.scalars(select(Notification).where(Notification.user_id == user.id, Notification.read.is_(False))).all(): n.read = True
    db.commit(); return {"ok": True}


# ---------- file attachments (PDF, PNG, JPG, DOCX up to 5 MB; checked by type and by file signature)
MAX_FILE = 5 * 1024 * 1024
MAGIC = {"application/pdf": b"%PDF", "image/png": b"\x89PNG", "image/jpeg": b"\xff\xd8\xff",
         "application/vnd.openxmlformats-officedocument.wordprocessingml.document": b"PK"}


@router.get("/requests/{rid}/files")
def files(rid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    _party(db, rid, user)
    rows = db.scalars(select(Attachment).where(Attachment.request_id == rid).order_by(Attachment.id)).all()
    return [{"id": a.id, "name": a.filename, "size": a.size, "mine": a.uploader_id == user.id, "at": a.created_at.isoformat()} for a in rows]


@router.post("/requests/{rid}/files", status_code=201)
async def upload(rid: int, file: UploadFile = File(...), user: User = Depends(current_user), db: Session = Depends(get_db)):
    r = _party(db, rid, user)
    if r.status != "accepted": raise HTTPException(409, "This conversation is closed.")
    ct = file.content_type or ""
    if ct not in MAGIC: raise HTTPException(415, "Allowed files: PDF, PNG, JPG and DOCX.")
    data = await file.read(MAX_FILE + 1)
    if len(data) > MAX_FILE: raise HTTPException(413, "The file is larger than 5 MB.")
    if not data.startswith(MAGIC[ct]): raise HTTPException(415, "The file content does not match its type.")
    name = re.sub(r"[^A-Za-z0-9._ -]", "_", file.filename or "file")[:100]
    db.add(Attachment(request_id=rid, uploader_id=user.id, filename=name, content_type=ct, size=len(data), data=data))
    notify(db, r.expert_id if user.id == r.miner_id else r.miner_id, f"New file on {r.ref}: {name}")
    db.commit(); return {"ok": True}


@router.get("/files/{fid}")
def download(fid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    a = db.get(Attachment, fid); r = db.get(CR, a.request_id) if a else None
    if not a or user.id not in (r.miner_id, r.expert_id): raise HTTPException(404, "File not found.")
    return Response(a.data, media_type=a.content_type, headers={"Content-Disposition": f'attachment; filename="{a.filename}"', "X-Content-Type-Options": "nosniff"})


# ---------- scheduling: one side proposes a time, the other confirms or declines
class NewAppt(BaseModel):
    starts_at: datetime
    note: str | None = Field(None, max_length=300)


class Respond(BaseModel):
    action: Literal["accept", "decline", "cancel"]


def _appt(a: Appointment, user: User):
    return {"id": a.id, "starts_at": a.starts_at.isoformat(), "note": a.note, "status": a.status, "mine": a.proposed_by == user.id}


@router.get("/requests/{rid}/appointments")
def appts(rid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    _party(db, rid, user)
    return [_appt(a, user) for a in db.scalars(select(Appointment).where(Appointment.request_id == rid).order_by(Appointment.starts_at)).all()]


@router.post("/requests/{rid}/appointments", status_code=201)
def propose(rid: int, body: NewAppt, user: User = Depends(current_user), db: Session = Depends(get_db)):
    r = _party(db, rid, user)
    if r.status != "accepted": raise HTTPException(409, "This conversation is closed.")
    dt = body.starts_at.replace(tzinfo=None)
    if dt < datetime.utcnow() - timedelta(days=1): raise HTTPException(422, "Choose a time in the future.")
    a = Appointment(request_id=rid, proposed_by=user.id, starts_at=dt, note=(body.note or None)); db.add(a)
    notify(db, r.expert_id if user.id == r.miner_id else r.miner_id, f"A meeting time was proposed on {r.ref}: {dt:%d %b %Y, %H:%M} (East Africa Time)")
    db.commit(); return _appt(a, user)


@router.post("/appointments/{aid}/respond")
def respond(aid: int, body: Respond, user: User = Depends(current_user), db: Session = Depends(get_db)):
    a = db.get(Appointment, aid)
    if not a: raise HTTPException(404, "Not found.")
    r = _party(db, a.request_id, user)
    if body.action == "cancel":
        if a.status not in ("proposed", "confirmed"): raise HTTPException(409, "Already settled.")
        a.status = "cancelled"
    else:
        if a.proposed_by == user.id or a.status != "proposed": raise HTTPException(409, "Only the other person can answer a proposal.")
        a.status = "confirmed" if body.action == "accept" else "declined"
    notify(db, a.proposed_by if a.proposed_by != user.id else (r.expert_id if user.id == r.miner_id else r.miner_id), f"Meeting on {r.ref} was {a.status}.")
    db.commit(); return _appt(a, user)


# ---------- ratings: the miner rates the expert once the work is marked complete
class NewRating(BaseModel):
    stars: int = Field(ge=1, le=5)
    comment: str | None = Field(None, max_length=500)


@router.post("/requests/{rid}/rating", status_code=201)
def rate(rid: int, body: NewRating, user: User = Depends(require_roles(Role.miner)), db: Session = Depends(get_db)):
    r = _get(db, rid)
    if r.miner_id != user.id or r.status != "closed" or not r.expert_id: raise HTTPException(409, "You can rate an expert after the work is marked complete.")
    if db.scalar(select(Rating.id).where(Rating.request_id == rid)): raise HTTPException(409, "You already rated this consultation.")
    db.add(Rating(request_id=rid, miner_id=user.id, expert_id=r.expert_id, stars=body.stars, comment=(body.comment or "").strip() or None))
    notify(db, r.expert_id, f"You received a {body.stars}-star rating on {r.ref}.")
    db.commit(); return {"ok": True}


# ---------- WhatsApp: only the miner of an accepted request, and only if the expert opted in
@router.get("/requests/{rid}/whatsapp")
def whatsapp(rid: int, user: User = Depends(require_roles(Role.miner)), db: Session = Depends(get_db)):
    r = _get(db, rid); w = db.get(ExpertWhatsApp, r.expert_id) if r.expert_id else None
    if r.miner_id != user.id or r.status != "accepted" or not (w and w.enabled): raise HTTPException(404, "WhatsApp contact is not available for this request.")
    digits = normalize_phone(db.get(User, r.expert_id).phone or "").lstrip("+")
    if not (digits.isdigit() and 11 <= len(digits) <= 15): raise HTTPException(404, "WhatsApp contact is not available for this request.")
    return {"url": f"https://wa.me/{digits}?text=" + quote(f"Hello, this is about request {r.ref} on the Responsible Gold Mining Platform.")}
