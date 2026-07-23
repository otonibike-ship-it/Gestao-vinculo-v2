"""reset_senha_token

Revision ID: 0006
Revises: 0005
Create Date: 2026-04-22
"""
from alembic import op
import sqlalchemy as sa

revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None

NOVOS_CONFIGS = [
    ("app_url", "http://localhost:3000"),
    ("tpl_reset_senha",
     "Olá, {nome}! Você solicitou a redefinição de senha.\n\n"
     "Clique no link abaixo para criar uma nova senha (válido por 1 hora):\n{link}\n\n"
     "Se não foi você, ignore este e-mail."),
]


def upgrade():
    op.add_column('usuarios', sa.Column('reset_token', sa.String(100), nullable=True))
    op.add_column('usuarios', sa.Column('reset_token_expira_em', sa.DateTime(timezone=True), nullable=True))

    op.bulk_insert(
        sa.table('configuracoes',
            sa.column('chave', sa.String),
            sa.column('valor', sa.Text),
        ),
        [{"chave": k, "valor": v} for k, v in NOVOS_CONFIGS],
    )


def downgrade():
    op.drop_column('usuarios', 'reset_token_expira_em')
    op.drop_column('usuarios', 'reset_token')
