"""ajusta fluxos por formulario: observacao_faturamento (troca) + link_gerado (link_pagamento)

Revision ID: 0013
Revises: 0012
Create Date: 2026-08-04
"""
from alembic import op
import sqlalchemy as sa

revision = '0013'
down_revision = '0012'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('troca_pedidos', sa.Column('observacao_faturamento', sa.Text(), nullable=True))
    op.add_column('links_pagamento', sa.Column('link_gerado', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('links_pagamento', 'link_gerado')
    op.drop_column('troca_pedidos', 'observacao_faturamento')
