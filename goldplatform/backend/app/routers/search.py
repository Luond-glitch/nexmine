import re
from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session
from ..db import get_db
from ..deps import current_user
from ..library_data import RESEARCH
from ..models import ExpertProfile, Resource, Story, Thread, User, Verification
from ..rag import DOCS

router = APIRouter(prefix="/api/search", tags=["search"])
GROUP = {"Regulation": ("Laws and regulations", "regs"), "Website": ("Websites and authorities", "sites"), "Education module": ("Mining education", "edu"), "Hotline": ("Hotlines and support", "support")}


def snip(t, n=150):
    t = re.sub(r"\s+", " ", t).strip()
    return t[:n] + ("…" if len(t) > n else "")


@router.get("")
def search(q: str = Query(min_length=2, max_length=80), _: User = Depends(current_user), db: Session = Depends(get_db)):
    toks = re.findall(r"[a-z0-9]{2,}", q.lower())
    if not toks: return {"q": q, "groups": []}
    groups: dict[str, list] = {}

    def add(g, item):
        if len(groups.setdefault(g, [])) < 6: groups[g].append(item)

    for d in DOCS:   # our own library
        low = d["text"].lower()
        if not all(t in low for t in toks): continue
        r = d["ref"]
        if d["kind"] == "Platform guide":
            g, view = ("Safety and environment guides", "safety" if r["topic"] == "safety" else "environment")
        else:
            g, view = GROUP[d["kind"]]
        body = r.get("purpose") or r.get("what") or r.get("intro") or r.get("summary") or r.get("when") or ""
        add(g, {"title": d["title"], "snippet": snip(body), "view": view, "url": d["url"] or None})
    for r in RESEARCH:
        if all(t in (r["title"] + r["summary"] + r["issuer"]).lower() for t in toks):
            add("Research library", {"title": r["title"], "snippet": snip(r["summary"]), "view": "library", "url": r["url"]})

    def like(col):
        esc = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        return col.ilike(f"%{esc}%", escape="\\")

    for e, u in db.execute(select(ExpertProfile, User).join(User, User.id == ExpertProfile.user_id).where(
            ExpertProfile.verification == Verification.verified,
            or_(like(User.full_name), like(ExpertProfile.firm_name), like(ExpertProfile.county), like(ExpertProfile.location), like(ExpertProfile.expertise))).limit(6)).all():
        add("EIA experts", {"title": u.full_name, "snippet": snip(f"{e.firm_name or ''} {e.location}, {e.county}. {e.expertise or ''}"), "view": "experts", "url": None})
    for s in db.scalars(select(Story).where(Story.status == "approved", or_(like(Story.title), like(Story.body))).limit(6)).all():
        add("Community stories", {"title": s.title, "snippet": snip(s.body), "view": "stories", "url": None})
    for t in db.scalars(select(Thread).where(Thread.hidden.is_(False), or_(like(Thread.title), like(Thread.body))).limit(6)).all():
        add("Research discussions", {"title": t.title, "snippet": snip(t.body), "view": "discuss", "url": None})
    for r in db.scalars(select(Resource).where(or_(like(Resource.title), like(Resource.summary))).limit(6)).all():
        add("Research library", {"title": r.title, "snippet": snip(r.summary or ""), "view": "library", "url": r.url})
    return {"q": q, "groups": [{"name": k, "items": v} for k, v in groups.items()]}
