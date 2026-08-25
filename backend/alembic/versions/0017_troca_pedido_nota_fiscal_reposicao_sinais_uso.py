"""adiciona data de emissao da NF, reposicao de estoque e sinais de uso na troca de pedido

Revision ID: 0017
Revises: 0016
Create Date: 2026-08-25
"""
from alembic import op
import sqlalchemy as sa

revision = '0017'
down_revision = '0016'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('troca_pedidos', sa.Column('data_emissao_nota_fiscal', sa.Date(), nullable=True))
    op.add_column('troca_pedidos', sa.Column('pedido_gerou_reposicao_estoque', sa.Boolean(), nullable=True))
    op.add_column('troca_pedidos', sa.Column('sinais_uso_pedido_cancelar', sa.Boolean(), nullable=True))


def downgrade():
    op.drop_column('troca_pedidos', 'sinais_uso_pedido_cancelar')
    op.drop_column('troca_pedidos', 'pedido_gerou_reposicao_estoque')
    op.drop_column('troca_pedidos', 'data_emissao_nota_fiscal')
