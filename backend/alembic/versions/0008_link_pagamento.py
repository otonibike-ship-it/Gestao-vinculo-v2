"""link de pagamento: tabela links_pagamento

Revision ID: 0008
Revises: 0007
Create Date: 2026-07-24
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON, ENUM

revision = '0008'
down_revision = '0007'
branch_labels = None
depends_on = None

NOVOS_CONFIGS = [
    ("tpl_novo_pedido_link", "Comercial, você tem um novo link de pagamento para análise: {numero_pedido} — Vendedor: {vendedor} — Franquia: {franquia_nome}"),
    ("tpl_triagem_link", "Você tem um link de pagamento para análise: {numero_pedido} — Vendedor: {vendedor} — Franquia: {franquia_nome}"),
    ("tpl_concluido_link", "Seu link de pagamento foi concluído com sucesso: {numero_pedido}"),
]


def upgrade() -> None:
    status_link_pagamento = ENUM(
        'aberto', 'aguardando_comercial', 'aguardando_faturamento',
        'aguardando_financeiro', 'aguardando_ti', 'fechado',
        name='statuslinkpagamento',
        create_type=False,
    )
    status_link_pagamento.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'links_pagamento',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('franquia_id', sa.Integer(), sa.ForeignKey('empresas.id'), nullable=False, index=True),
        sa.Column('motivo', sa.Text(), nullable=False),
        sa.Column('numero_pedido', sa.String(50), nullable=False, index=True),
        sa.Column('data_pedido', sa.Date(), nullable=False),
        sa.Column('valor_pedido', sa.Numeric(12, 2), nullable=False),
        sa.Column('valor_link', sa.Numeric(12, 2), nullable=False),
        sa.Column('quantidade_parcelas', sa.Integer(), nullable=False),
        sa.Column('codigo_produto', sa.String(100), nullable=False),
        sa.Column('modelo', sa.Text(), nullable=False),
        sa.Column('vendedor', sa.String(200), nullable=False),
        sa.Column('nome_cliente', sa.Text(), nullable=False),
        sa.Column('cpf', sa.String(14), nullable=False),
        sa.Column('email', sa.String(200), nullable=False),
        sa.Column('endereco', sa.Text(), nullable=False),
        sa.Column('telefone', sa.String(20), nullable=False),
        sa.Column('status', status_link_pagamento, nullable=False, server_default='aguardando_comercial'),
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
    op.drop_table('links_pagamento')
    ENUM(name='statuslinkpagamento').drop(op.get_bind(), checkfirst=True)
    op.execute(
        "DELETE FROM configuracoes WHERE chave IN "
        "('tpl_novo_pedido_link', 'tpl_triagem_link', 'tpl_concluido_link')"
    )
