from fastapi import APIRouter, Depends
from ..deps import current_user
from ..config import settings
from ..library_data import CHECKED, EDU, EMERGENCY, GUIDES, REGULATIONS, SITES, SUPPORT
from ..models import User

router = APIRouter(prefix="/api/library", tags=["library"])


@router.get("/regulations")
def regulations(_: User = Depends(current_user)):
    return {"checked": CHECKED, "items": REGULATIONS}


@router.get("/guides/{topic}")
def guides(topic: str, _: User = Depends(current_user)):
    laws = {r["id"]: {"title": r["title"], "link": r["link"]} for r in REGULATIONS}
    items = [{**g, "law": laws.get(g["law"])} for g in GUIDES if g["topic"] == topic]
    return {"emergency": EMERGENCY if topic == "safety" else None, "items": items}


@router.get("/support")
def support(_: User = Depends(current_user)):
    return {"checked": CHECKED, "groups": SUPPORT, "platform": {"email": settings.support_email, "phone": settings.support_phone}}


@router.get("/education")
def education(_: User = Depends(current_user)):
    return {"items": EDU}


@router.get("/sites")
def sites(_: User = Depends(current_user)):
    return {"checked": CHECKED, "items": SITES}
