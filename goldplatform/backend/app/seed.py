"""Demo accounts (python -m app.seed) and first-admin bootstrap. Demo accounts are for testing only: never enable them in production."""
import logging
from sqlalchemy import func, select
from .config import settings
from .db import Base, SessionLocal, engine
from .models import ExpertProfile, ResearcherProfile, Role, User
from .security import hash_password, password_problem

log = logging.getLogger("seed")
DEMO = [
    dict(role=Role.admin, full_name="Super Administrator", email="admin@goldplatform.demo", pw="Admin@Demo2026"),
    dict(role=Role.expert, full_name="Demo Environmental Officer", email="demo.expert@goldplatform.demo", pw="Expert@Demo2026", phone="+254700000000"),
    dict(role=Role.miner, username="demo_miner", pw="Miner@123", phone="+254700000001"),
    dict(role=Role.researcher, full_name="Demo Student", email="demo.researcher@goldplatform.demo", pw="Student@123"),
]


def ensure(db, a) -> bool:
    q = select(User.id).where(func.lower(User.username) == a["username"].lower()) if a.get("username") else select(User.id).where(func.lower(User.email) == a["email"].lower())
    if db.scalar(q): return False
    u = User(role=a["role"], username=a.get("username"), full_name=a.get("full_name"), email=a.get("email"), phone=a.get("phone"),
             email_verified=True, password_hash=hash_password(a["pw"]))
    if a["role"] == Role.expert:
        u.expert = ExpertProfile(firm_name="Demo Environmental Consultants", location="Bondo Town", county="Siaya", eia_licence_no="DEMO/EIA/001",
                                 qualifications="BSc Environmental Science", expertise="EIA, rehabilitation planning, waste management", years_experience=8)
    if a["role"] == Role.researcher: u.researcher = ResearcherProfile(institution="Demo University", discipline="Environmental Science")
    db.add(u); db.commit(); return True


def bootstrap():
    with SessionLocal() as db:
        if settings.admin_email and settings.admin_password:
            bad = password_problem(settings.admin_password, "admin")
            if bad: log.error("ADMIN_PASSWORD rejected: %s", bad)
            elif ensure(db, dict(role=Role.admin, full_name="Administrator", email=settings.admin_email, pw=settings.admin_password)):
                log.warning("Administrator %s created.", settings.admin_email)
        if settings.seed_demo:
            for a in DEMO: ensure(db, a)


if __name__ == "__main__":
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        for a in DEMO: print(("created: " if ensure(db, a) else "exists:  ") + (a.get("email") or a["username"]) + "  /  " + a["pw"])
