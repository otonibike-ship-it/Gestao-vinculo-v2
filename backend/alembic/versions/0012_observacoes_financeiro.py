"""adiciona observacoes_financeiro em vinculos

Revision ID: 0012
Revises: 0011
Create Date: 2026-08-04
"""
from alembic import op
import sqlalchemy as sa

revision = '0012'
down_revision = '0011'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('vinculos', sa.Column('observacoes_financeiro', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('vinculos', 'observacoes_financeiro')
