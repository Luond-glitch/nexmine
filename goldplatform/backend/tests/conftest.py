import os
os.environ.update(DATABASE_URL="sqlite:///./test_gp.db", SECRET_KEY="test-secret", AUTO_CREATE_TABLES="true", SEED_DEMO="false",
                  COOKIE_SECURE="false", GEMINI_API_KEY="", OPENAI_API_KEY="", COHERE_API_KEY="", ADMIN_EMAIL="", ADMIN_PASSWORD="")
import pytest
from fastapi.testclient import TestClient
from app.db import Base, SessionLocal, engine
from app.main import app
from app.routers import auth
from app.seed import DEMO, ensure

auth.limiter.enabled = False   # rate limits are tested by hand, not here


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(engine); Base.metadata.create_all(engine)
    yield


@pytest.fixture
def make_client():
    return lambda: TestClient(app)


@pytest.fixture
def admin(make_client):
    with SessionLocal() as db: ensure(db, DEMO[0])
    c = make_client()
    assert c.post("/api/auth/login", json={"role": "admin", "identifier": "admin@goldplatform.demo", "password": "Admin@Demo2026"}).status_code == 200
    return c


def register_expert(c, email="e@test.com", licence="EIA/001", pw="Expert@1"):
    return c.post("/api/auth/register/expert", json=dict(full_name="Ada Expert", email=email, password=pw, confirm_password=pw, phone="0712345678",
                  location="Bondo", county="Siaya", eia_licence_no=licence))


def register_miner(c, username="miner1", pw="Gold@1"):
    return c.post("/api/auth/register/miner", json=dict(username=username, password=pw, confirm_password=pw, phone="0722000000"))


@pytest.fixture
def approved_expert(make_client, admin):
    c = make_client(); assert register_expert(c).status_code == 201
    uid = c.get("/api/auth/me").json()["id"]
    assert admin.post(f"/api/admin/experts/{uid}/status", json={"status": "verified"}).status_code == 200
    return c, uid
