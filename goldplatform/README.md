# Responsible Gold Mining and Environmental Protection Platform

FastAPI + PostgreSQL backend (`backend/`) and React + Vite + Tailwind frontend (`frontend/`).

## Run locally
```bash
# Database (PostgreSQL 14+)
createdb goldplatform

# Backend
cd backend && python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # fill DATABASE_URL and SECRET_KEY; set SEED_DEMO=true for demo accounts
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend && npm install && npm run dev      # http://localhost:5173
```
Check the backend at http://localhost:8000/api/health (shows the build name) and http://localhost:8000/docs.

## Demo accounts (only when SEED_DEMO=true, or `python -m app.seed`)
| Portal | Sign in with | Password |
|---|---|---|
| Administrator | admin@goldplatform.demo | Admin@Demo2026 |
| Miner | demo_miner | Miner@123 |
| Student or researcher | demo.researcher@goldplatform.demo | Student@123 |
| Environmental expert (starts pending) | demo.expert@goldplatform.demo | Expert@Demo2026 |

Never enable demo accounts in production.

## Password rules
Miner and student: at least 4 characters and one special character. Expert: at least 6 and one special character. Administrator: at least 10 and one special character.

## Password reset
By email address or phone number. Email needs `SMTP_*`; SMS needs an Africa's Talking account (`AT_*`). Without them nothing is delivered (in development the link is printed in the server log).

## Database migrations
`alembic upgrade head` applies migrations (the first one creates all current tables). After changing `app/models.py`:
`alembic revision --autogenerate -m "describe the change"` then `alembic upgrade head`. In production set `AUTO_CREATE_TABLES=false`.

## Tests
```bash
cd backend && pip install -r requirements-dev.txt && pytest -q
```
Tests use a local SQLite file and no AI keys.

## Deploy
See `docs/DEPLOY.md` (Render backend, Vercel frontend).

## Keys and services needed
Gemini, OpenAI and Cohere API keys (AI); optional SMTP and Africa's Talking (password reset). Keys live only in backend environment variables.
