"""Baseline: creates every table that exists today (safe to run on a database that already has some of them).

Revision ID: 0001
Revises:
"""
from alembic import op
from app.db import Base
import app.models  # noqa: F401

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    Base.metadata.create_all(bind=op.get_bind(), checkfirst=True)


def downgrade():
    raise RuntimeError("The baseline is not reversible: it would delete all data.")
