from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from .config import settings

def _url(u: str) -> str:
    for p in ("postgres://", "postgresql://"):
        if u.startswith(p): return "postgresql+psycopg://" + u[len(p):]
    return u


engine = create_engine(_url(settings.database_url), pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
