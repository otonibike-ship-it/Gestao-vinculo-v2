"""troca de pedido: novo perfil faturamento, tabela troca_pedidos

Revision ID: 0007
Revises: 0006
Create Date: 2026-07-23
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON, ENUM

revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None

NOVOS_CONFIGS = [
    ("email_faturamento", ""),
    ("tpl_novo_pedido_troca", "Comercial, você tem uma nova troca de pedido para análise: {numero_pedido_cancelar} — Vendedor: {nome_vendedor} — Franquia: {franquia_nome}"),
    ("tpl_triagem_troca", "Você tem uma troca de pedido para análise: {numero_pedido_cancelar} — Vendedor: {nome_vendedor} — Franquia: {franquia_nome}"),
    ("tpl_concluido_troca", "Sua troca de pedido foi concluída com sucesso: {numero_pedido_cancelar}"),
]


def upgrade() -> None:
    # ALTER TYPE nao pode rodar dentro de uma transacao no PostgreSQL.
    connection = op.get_bind()
    connection.execute(sa.text("COMMIT"))
    connection.execute(sa.text("ALTER TYPE perfilusuario ADD VALUE IF NOT EXISTS 'faturamento'"))
    connection.execute(sa.text("BEGIN"))

    status_troca_pedido = ENUM(
        'aberto', 'aguardando_comercial', 'aguardando_faturamento',
        'aguardando_financeiro', 'aguardando_ti', 'fechado',
        name='statustrocapedido',
        create_type=False,  # criado manualmente abaixo — evita CREATE TYPE duplicado no create_table
    )
    status_troca_pedido.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'troca_pedidos',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('franquia_id', sa.Integer(), sa.ForeignKey('empresas.id'), nullable=False, index=True),
        sa.Column('motivo', sa.String(500), nullable=False),
        sa.Column('nome_vendedor', sa.String(200), nullable=False),
        sa.Column('numero_pedido_cancelar', sa.String(50), nullable=False, index=True),
        sa.Column('data_pedido_cancelar', sa.Date(), nullable=False),
        sa.Column('codigo_produto_cancelar', sa.String(100), nullable=False),
        sa.Column('descricao_pedido_cancelar', sa.Text(), nullable=False),
        sa.Column('numero_novo_pedido', sa.String(50), nullable=False),
        sa.Column('codigo_produto_novo', sa.String(100), nullable=False),
        sa.Column('descricao_novo_pedido', sa.Text(), nullable=False),
        sa.Column('status_portal', sa.String(50), nullable=False),
        sa.Column('status', status_troca_pedido, nullable=False, server_default='aguardando_comercial'),
        sa.Column('anexos', JSON(), nullable=True),
        sa.Column('observacao_comercial', sa.Text(), nullable=True),
        sa.Column('justificativa_reprovacao', sa.Text(), nullable=True),
        sa.Column('destino_reprovacao', sa.String(50), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('atualizado_em', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.bulk_insert(
        sa.table('configuracoes',
            sa.column('chave', sa.String),
            sa.column('valor', sa.Text),
        ),
        [{"chave": k, "valor": v} for k, v in NOVOS_CONFIGS],
    )


def downgrade() -> None:
    op.drop_table('troca_pedidos')
    ENUM(name='statustrocapedido').drop(op.get_bind(), checkfirst=True)
    op.execute(
        "DELETE FROM configuracoes WHERE chave IN "
        "('email_faturamento', 'tpl_novo_pedido_troca', 'tpl_triagem_troca', 'tpl_concluido_troca')"
    )
    # Nao e possivel remover valores de enum no PostgreSQL sem recriar o tipo
