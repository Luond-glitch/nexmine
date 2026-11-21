import hashlib, re, secrets
from datetime import datetime, timedelta, timezone
import bcrypt, jwt
from .config import settings

ALGO = "HS256"
_DUMMY = bcrypt.hashpw(b"dummy-password", bcrypt.gensalt(12)).decode()


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode()[:72], bcrypt.gensalt(12)).decode()


def verify_password(pw: str, hashed: str | None) -> bool:
    # always run a comparison so timing doesn't reveal whether an account exists
    return bcrypt.checkpw(pw.encode()[:72], (hashed or _DUMMY).encode()) and hashed is not None


MIN_LEN = {"miner": 4, "researcher": 4, "expert": 6, "admin": 10}
SPECIAL = re.compile(r"[^A-Za-z0-9\s]")


def password_rule(role: str = "miner") -> str:
    return f"Use at least {MIN_LEN.get(role, 6)} characters and include one special character, for example @ # ! ? $ %."


def password_problem(pw: str, role: str = "miner") -> str | None:
    if len(pw) < MIN_LEN.get(role, 6) or not SPECIAL.search(pw):
        return password_rule(role)
    return None


def make_token(user_id: int, remember: bool) -> tuple[str, int]:
    ttl = timedelta(days=settings.remember_days) if remember else timedelta(hours=settings.session_hours)
    exp = datetime.now(timezone.utc) + ttl
    return jwt.encode({"sub": str(user_id), "exp": exp}, settings.secret_key, ALGO), int(ttl.total_seconds())


def read_token(token: str) -> int | None:
    try:
        return int(jwt.decode(token, settings.secret_key, algorithms=[ALGO])["sub"])
    except Exception:
        return None


def new_reset_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(32)
    return raw, hashlib.sha256(raw.encode()).hexdigest()


def hash_reset(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def normalize_phone(p: str) -> str:
    """Kenyan numbers become +254XXXXXXXXX; anything else is kept with digits only."""
    d = re.sub(r"[^\d+]", "", p); digits = d.lstrip("+")
    if digits.startswith("254"): return "+" + digits
    if digits.startswith("0"): return "+254" + digits[1:]
    return ("+" if d.startswith("+") else "") + digits


def phone_variants(p: str) -> set[str]:
    n = normalize_phone(p); core = n[4:] if n.startswith("+254") else n.lstrip("+")
    return {n, f"254{core}", f"0{core}"} if n.startswith("+254") else {n, n.lstrip("+")}
