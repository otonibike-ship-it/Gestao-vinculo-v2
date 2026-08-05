"""adiciona campos faltantes em troca_pedidos: motivo_detalhado, dados do cliente e valores

Revision ID: 0014
Revises: 0013
Create Date: 2026-08-05
"""
from alembic import op
import sqlalchemy as sa

revision = '0014'
down_revision = '0013'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('troca_pedidos', sa.Column('motivo_detalhado', sa.Text(), nullable=True))
    op.add_column('troca_pedidos', sa.Column('nome_cliente', sa.String(300), nullable=True))
    op.add_column('troca_pedidos', sa.Column('cpf', sa.String(14), nullable=True))
    op.add_column('troca_pedidos', sa.Column('valor_novo_pedido', sa.Numeric(12, 2), nullable=True))
    op.add_column('troca_pedidos', sa.Column('valor_pago_cliente', sa.Numeric(12, 2), nullable=True))


def downgrade():
    op.drop_column('troca_pedidos', 'valor_pago_cliente')
    op.drop_column('troca_pedidos', 'valor_novo_pedido')
    op.drop_column('troca_pedidos', 'cpf')
    op.drop_column('troca_pedidos', 'nome_cliente')
    op.drop_column('troca_pedidos', 'motivo_detalhado')
