import re
from pydantic import BaseModel, EmailStr, Field, field_validator

from .security import normalize_phone

PHONE = re.compile(r"^\+?[0-9]{9,15}$")


class _Phone(BaseModel):
    @field_validator("phone", check_fields=False)
    @classmethod
    def ok(cls, v):
        if v is None or v == "": return None
        v = re.sub(r"[\s-]", "", v)
        if not PHONE.match(v): raise ValueError("Enter a valid phone number, e.g. +254712345678")
        return normalize_phone(v)


class MinerRegister(_Phone):
    username: str = Field(pattern=r"^[A-Za-z0-9_.]{3,40}$")
    password: str = Field(max_length=128)
    confirm_password: str
    phone: str


class ExpertRegister(_Phone):
    full_name: str = Field(min_length=3, max_length=120)
    firm_name: str | None = Field(None, max_length=160)
    email: EmailStr
    password: str = Field(max_length=128)
    confirm_password: str
    phone: str
    location: str = Field(min_length=2, max_length=160)
    county: str = Field(min_length=2, max_length=60)
    eia_licence_no: str = Field(min_length=3, max_length=60)
    qualifications: str | None = None
    expertise: str | None = None
    years_experience: int | None = Field(None, ge=0, le=60)


class ResearcherRegister(_Phone):
    phone: str | None = None
    full_name: str = Field(min_length=3, max_length=120)
    email: EmailStr
    password: str = Field(max_length=128)
    confirm_password: str
    institution: str | None = None
    discipline: str | None = None
    interests: str | None = None
    county: str | None = None


class Login(BaseModel):
    role: str = Field(pattern="^(miner|expert|researcher|admin)$")
    identifier: str = Field(min_length=2, max_length=254)   # username, email or full name
    password: str = Field(max_length=128)
    remember: bool = False


class Forgot(BaseModel):
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=20)


class Reset(BaseModel):
    token: str
    password: str = Field(max_length=128)


class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(max_length=128)


class UserOut(BaseModel):
    id: int
    role: str
    username: str | None
    full_name: str | None
    email: str | None
    language: str
    verification: str | None = None
