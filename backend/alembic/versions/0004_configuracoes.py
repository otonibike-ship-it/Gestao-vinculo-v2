"""configuracoes

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-16
"""
from alembic import op
import sqlalchemy as sa

revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None

DEFAULTS = [
    ("smtp_host", "smtp.gmail.com"),
    ("smtp_port", "587"),
    ("smtp_user", ""),
    ("smtp_password", ""),
    ("smtp_tls", "true"),
    ("email_comercial", "suportefranquias01@sensebike.com.br"),
    ("email_financeiro", "financeiro01@sensebike.com.br"),
    ("email_ti", "helpdesk@sensebike.com.br"),
    ("tpl_novo_pedido", "Comercial, você tem um novo pedido para análise: {numero_pedido} — Cliente: {nome_cliente} — Franquia: {franquia_nome}"),
    ("tpl_aprovado_financeiro", "Financeiro, você tem um novo pedido de vínculo para ser analisado: {numero_pedido} — Cliente: {nome_cliente} — Franquia: {franquia_nome}"),
    ("tpl_aprovado_ti", "TI, você tem um novo pedido para ser analisado: {numero_pedido} — Cliente: {nome_cliente} — Franquia: {franquia_nome}"),
    ("tpl_reprovado", "Pedido reprovado, volte à gestão para tratativas. Pedido: {numero_pedido} — Motivo: {motivo}"),
    ("tpl_vinculado", "Seu pedido foi vinculado com sucesso: {numero_pedido} — Cliente: {nome_cliente}"),
]


def upgrade():
    op.create_table(
        'configuracoes',
        sa.Column('chave', sa.String(100), primary_key=True),
        sa.Column('valor', sa.Text(), nullable=True),
        sa.Column('atualizado_em', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.bulk_insert(
        sa.table('configuracoes',
            sa.column('chave', sa.String),
            sa.column('valor', sa.Text),
        ),
        [{"chave": k, "valor": v} for k, v in DEFAULTS],
    )


def downgrade():
    op.drop_table('configuracoes')
