from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from .config import settings
from .db import Base, engine
from .security import password_rule
from .routers import auth, chat, consult, experts, library, stories, discuss, expert_profile, geo, search, tools, admin_users

app = FastAPI(title="Responsible Gold Mining Platform API", docs_url=None if settings.cookie_secure else "/docs")
app.state.limiter = auth.limiter
app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_origin], allow_credentials=True,
                   allow_methods=["GET", "POST", "PATCH", "DELETE"], allow_headers=["Content-Type"])


@app.exception_handler(RateLimitExceeded)
async def limited(_: Request, __):
    return JSONResponse({"detail": "Too many attempts. Please wait a minute and try again."}, 429)


@app.middleware("http")
async def headers(request: Request, call_next):
    r = await call_next(request)
    r.headers.update({"X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY",
                      "Referrer-Policy": "same-origin", "Cache-Control": "no-store"})
    return r


@app.on_event("startup")
def init():
    if settings.auto_create_tables: Base.metadata.create_all(engine)   # development; in production use `alembic upgrade head`
    from .seed import bootstrap
    bootstrap()


app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(experts.router)
app.include_router(library.router)
app.include_router(consult.router)
app.include_router(consult.notes)
app.include_router(stories.router)
app.include_router(stories.admin)
app.include_router(discuss.router)
app.include_router(discuss.res)
app.include_router(discuss.admin)
app.include_router(expert_profile.router)
app.include_router(geo.router)
app.include_router(geo.admin)
app.include_router(search.router)
app.include_router(tools.router)
app.include_router(admin_users.router)


@app.get("/api/health")
def health():   # open http://localhost:8000/api/health to confirm which version is running
    paths = {getattr(r, "path", "") for r in app.routes}
    return {"status": "ok", "build": "p9-final", "has_chat": "/api/chat" in paths,
            "password_rules": {"miner": password_rule("miner"), "researcher": password_rule("researcher"), "expert": password_rule("expert")}}
