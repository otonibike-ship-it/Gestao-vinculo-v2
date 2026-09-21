"""marca necessario_validacao nos vinculos que passaram (ou estao) no Financeiro

Ate aqui o marcador so era ligado no caminho "padrao" da aprovacao do Comercial, que a
UI nunca usa (ela sempre envia o destino escolhido). Pedidos encaminhados ao Financeiro
pelo seletor ficaram com necessario_validacao = false, escondendo a etapa Financeiro no
historico do fluxo e mostrando "Nao" em "Valid. Financeiro".

Revision ID: 0020
Revises: 0019
Create Date: 2026-09-21
"""
from alembic import op
import sqlalchemy as sa

revision = '0020'
down_revision = '0019'
branch_labels = None
depends_on = None


def upgrade():
    op.execute(sa.text(r"""
        UPDATE vinculos
        SET necessario_validacao = true
        WHERE necessario_validacao = false
          AND (
            status = 'validacao_financeiro'
            OR (observacoes_financeiro IS NOT NULL AND btrim(observacoes_financeiro) <> '')
            OR (historico_observacoes IS NOT NULL
                AND historico_observacoes::text ~ '"area"\s*\:\s*"financeiro"')
          )
    """))


def downgrade():
    # Backfill de dados: nao ha como distinguir o que foi marcado por esta migracao.
    pass
