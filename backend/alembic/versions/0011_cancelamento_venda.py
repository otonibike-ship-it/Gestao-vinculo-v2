"""cancelamento de venda: tabela cancelamentos_venda

Revision ID: 0011
Revises: 0010
Create Date: 2026-07-24
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON, ENUM

revision = '0011'
down_revision = '0010'
branch_labels = None
depends_on = None

NOVOS_CONFIGS = [
    ("tpl_novo_pedido_cancelamento", "Comercial, você tem um novo cancelamento de venda para análise: {numero_pedido} — Vendedor: {vendedor} — Franquia: {franquia_nome}"),
    ("tpl_triagem_cancelamento", "Você tem um cancelamento de venda para análise: {numero_pedido} — Vendedor: {vendedor} — Franquia: {franquia_nome}"),
    ("tpl_concluido_cancelamento", "Seu cancelamento de venda foi concluído: {numero_pedido}"),
]


def upgrade() -> None:
    status_cancelamento = ENUM(
        'aberto', 'aguardando_comercial', 'aguardando_faturamento',
        'aguardando_financeiro', 'aguardando_ti', 'fechado',
        name='statuscancelamentovenda',
        create_type=False,
    )
    status_cancelamento.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'cancelamentos_venda',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('franquia_id', sa.Integer(), sa.ForeignKey('empresas.id'), nullable=False, index=True),
        sa.Column('motivo', sa.Text(), nullable=False),
        sa.Column('vendedor', sa.String(200), nullable=False),
        sa.Column('numero_pedido_cancelar', sa.String(50), nullable=False, index=True),
        sa.Column('data_pedido_cancelar', sa.Date(), nullable=False),
        sa.Column('status_portal', sa.String(50), nullable=False),
        sa.Column('numero_nota_fiscal', sa.String(50), nullable=False),
        sa.Column('data_emissao_nota_fiscal', sa.Date(), nullable=False),
        sa.Column('bike_na_loja', sa.Boolean(), nullable=False),
        sa.Column('sinais_uso', sa.Boolean(), nullable=False),
        sa.Column('anexos_evidencias_uso', JSON(), nullable=True),
        sa.Column('codigo_produto', sa.String(100), nullable=False),
        sa.Column('descricao_modelo', sa.Text(), nullable=False),
        sa.Column('nome_cliente', sa.Text(), nullable=False),
        sa.Column('cpf', sa.String(14), nullable=False),
        sa.Column('valor_total_pago_cliente', sa.Numeric(12, 2), nullable=False),
        sa.Column('valor_total_pedido', sa.Numeric(12, 2), nullable=False),
        sa.Column('valor_cancelar', sa.Numeric(12, 2), nullable=False),
        sa.Column('forma_pagamento', sa.String(50), nullable=False),
        sa.Column('pago_mais_um_cartao', sa.Boolean(), nullable=False),
        sa.Column('anexos_portal_comprovante', JSON(), nullable=True),
        sa.Column('status', status_cancelamento, nullable=False, server_default='aguardando_comercial'),
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
    op.drop_table('cancelamentos_venda')
    ENUM(name='statuscancelamentovenda').drop(op.get_bind(), checkfirst=True)
    op.execute(
        "DELETE FROM configuracoes WHERE chave IN "
        "('tpl_novo_pedido_cancelamento', 'tpl_triagem_cancelamento', 'tpl_concluido_cancelamento')"
    )
