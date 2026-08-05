"""torna numero_pedido e valor_pedido_portal opcionais em solicitacoes_estorno

Caso de sinal/garantia pago na loja sem um pedido associado.

Revision ID: 0015
Revises: 0014
Create Date: 2026-08-05
"""
from alembic import op
import sqlalchemy as sa

revision = '0015'
down_revision = '0014'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column('solicitacoes_estorno', 'numero_pedido', nullable=True)
    op.alter_column('solicitacoes_estorno', 'valor_pedido_portal', nullable=True)


def downgrade():
    op.alter_column('solicitacoes_estorno', 'valor_pedido_portal', nullable=False)
    op.alter_column('solicitacoes_estorno', 'numero_pedido', nullable=False)
