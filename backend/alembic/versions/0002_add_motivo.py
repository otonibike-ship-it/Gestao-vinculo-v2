"""add campo motivo ao vinculos

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-26
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("vinculos", sa.Column("motivo", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("vinculos", "motivo")
