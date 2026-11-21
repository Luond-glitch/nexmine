# Deploying: backend on Render, frontend on Vercel

## 1. Push the project to GitHub
`backend/`, `frontend/`, `render.yaml` at the top level. Do not commit `.env`.

## 2. Render: database
New > PostgreSQL. Copy its **Internal Database URL** (or use the Blueprint, which wires it automatically).
Free Render databases are deleted after a limited period, so for real use choose a paid plan or an external Postgres (for example Neon or Supabase) and paste its URL as `DATABASE_URL`.

## 3. Render: web service
New > Web Service > your repository.
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `alembic upgrade head && uvicorn app.main:app --reload --port 8000`
- Health check path: `/api/health`
- Environment: `PYTHON_VERSION=3.12.7`, `DATABASE_URL`, `SECRET_KEY` (long random), `COOKIE_SECURE=true`, `AUTO_CREATE_TABLES=false`, `FRONTEND_ORIGIN=https://<your-app>.vercel.app`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (10+ characters with a special character), `GEMINI_API_KEY`, `OPENAI_API_KEY`, `COHERE_API_KEY`, and optionally `SMTP_*`, `AT_*`, `SUPPORT_EMAIL`, `SUPPORT_PHONE`.
Render accepts `postgres://` URLs; the app converts them.
Free web services sleep when idle, so the first request after a pause can take about a minute.

## 4. Vercel: connect the API
Edit `frontend/vercel.json` and replace `YOUR-RENDER-SERVICE` with your Render service name, then redeploy. The rewrite makes the browser call `/api/...` on your Vercel domain, which Vercel forwards to Render. This keeps the login cookie first-party, so no cross-site cookie or CORS problems.

## 5. First sign-in
Open `https://<your-app>.vercel.app/auth/admin` and sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Approve experts from the admin dashboard.

## 6. Checks
`https://<service>.onrender.com/api/health` returns the build name. Sign in through Vercel, open the AI assistant, and use Admin > Test AI providers.
