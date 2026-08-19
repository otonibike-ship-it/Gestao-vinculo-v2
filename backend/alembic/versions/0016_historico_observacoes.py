"""adiciona historico_observacoes (log de notas por area) em todos os formularios

Suporta o novo fluxo de roteamento livre: cada area pode aprovar ou
reprovar mandando pra qualquer outra area do formulario (+ franquia),
com uma observacao opcional que fica registrada no historico.

Revision ID: 0016
Revises: 0015
Create Date: 2026-08-19
"""
from alembic import op
import sqlalchemy as sa

revision = '0016'
down_revision = '0015'
branch_labels = None
depends_on = None

TABELAS = [
    'vinculos',
    'troca_pedidos',
    'links_pagamento',
    'cartas_correcao',
    'solicitacoes_estorno',
    'cancelamentos_venda',
]


def upgrade():
    for tabela in TABELAS:
        op.add_column(tabela, sa.Column('historico_observacoes', sa.JSON(), nullable=True))


def downgrade():
    for tabela in TABELAS:
        op.drop_column(tabela, 'historico_observacoes')
