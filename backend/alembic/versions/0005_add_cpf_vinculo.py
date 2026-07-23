"""add cpf to vinculos

Revision ID: 0005
Revises: 0004
Create Date: 2026-04-22
"""
from alembic import op
import sqlalchemy as sa

revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('vinculos', sa.Column('cpf', sa.String(14), nullable=True))


def downgrade():
    op.drop_column('vinculos', 'cpf')
