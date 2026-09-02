"""adiciona numero da nota fiscal na troca de pedido

Revision ID: 0019
Revises: 0018
Create Date: 2026-09-02
"""
from alembic import op
import sqlalchemy as sa

revision = '0019'
down_revision = '0018'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('troca_pedidos', sa.Column('numero_nota_fiscal', sa.String(50), nullable=True))


def downgrade():
    op.drop_column('troca_pedidos', 'numero_nota_fiscal')
