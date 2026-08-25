"""torna opcionais todos os campos de cancelamento_venda exceto franquia_id e anexos do portal

Revision ID: 0018
Revises: 0017
Create Date: 2026-08-25
"""
from alembic import op
import sqlalchemy as sa

revision = '0018'
down_revision = '0017'
branch_labels = None
depends_on = None

_COLUNAS = [
    ('motivo', sa.Text()),
    ('vendedor', sa.String(200)),
    ('numero_pedido_cancelar', sa.String(50)),
    ('data_pedido_cancelar', sa.Date()),
    ('status_portal', sa.String(50)),
    ('numero_nota_fiscal', sa.String(50)),
    ('data_emissao_nota_fiscal', sa.Date()),
    ('bike_na_loja', sa.Boolean()),
    ('sinais_uso', sa.Boolean()),
    ('codigo_produto', sa.String(100)),
    ('descricao_modelo', sa.Text()),
    ('nome_cliente', sa.Text()),
    ('cpf', sa.String(14)),
    ('valor_total_pago_cliente', sa.Numeric(12, 2)),
    ('valor_total_pedido', sa.Numeric(12, 2)),
    ('valor_cancelar', sa.Numeric(12, 2)),
    ('forma_pagamento', sa.String(50)),
    ('pago_mais_um_cartao', sa.Boolean()),
]


def upgrade():
    for nome, tipo in _COLUNAS:
        op.alter_column('cancelamentos_venda', nome, existing_type=tipo, nullable=True)


def downgrade():
    for nome, tipo in _COLUNAS:
        op.alter_column('cancelamentos_venda', nome, existing_type=tipo, nullable=False)
