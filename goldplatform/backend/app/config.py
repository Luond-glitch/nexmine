from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False
    )

    database_url: str
    secret_key: str
    frontend_origin: str = "http://localhost:5173"
    cookie_secure: bool = False
    session_hours: int = 8
    remember_days: int = 30

    # AI providers (added for Phase 3)
    gemini_api_key: str = ""
    openai_api_key: str = ""
    cohere_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    openai_model: str = "gpt-4o-mini"
    cohere_model: str = "command-r-08-2024"

    auto_create_tables: bool = True      # set false in production and run `alembic upgrade head` instead
    admin_email: str = ""                # first administrator, created at startup if missing
    admin_password: str = ""
    seed_demo: bool = False              # creates demo accounts (never in production)

    smtp_host: str = ""                  # password-reset emails
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    at_username: str = ""                # Africa's Talking, for password-reset SMS
    at_api_key: str = ""
    at_sender: str = ""

    support_email: str = ""   # shown on Contact and Support when set
    support_phone: str = ""


settings = Settings()
