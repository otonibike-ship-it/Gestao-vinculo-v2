"""solicitacao de estorno: tabela solicitacoes_estorno

Revision ID: 0010
Revises: 0009
Create Date: 2026-07-24
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON, ENUM

revision = '0010'
down_revision = '0009'
branch_labels = None
depends_on = None

NOVOS_CONFIGS = [
    ("tpl_novo_pedido_estorno", "Comercial, você tem uma nova solicitação de estorno para análise: {numero_pedido} — Vendedor: {vendedor} — Franquia: {franquia_nome}"),
    ("tpl_triagem_estorno", "Você tem uma solicitação de estorno para análise: {numero_pedido} — Vendedor: {vendedor} — Franquia: {franquia_nome}"),
    ("tpl_concluido_estorno", "Sua solicitação de estorno foi concluída: {numero_pedido}"),
]


def upgrade() -> None:
    status_estorno = ENUM(
        'aberto', 'aguardando_comercial', 'aguardando_faturamento',
        'aguardando_financeiro', 'aguardando_ti', 'fechado',
        name='statussolicitacaoestorno',
        create_type=False,
    )
    status_estorno.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'solicitacoes_estorno',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('franquia_id', sa.Integer(), sa.ForeignKey('empresas.id'), nullable=False, index=True),
        sa.Column('motivo', sa.Text(), nullable=False),
        sa.Column('vendedor', sa.String(200), nullable=False),
        sa.Column('numero_pedido', sa.String(50), nullable=False, index=True),
        sa.Column('data_pedido', sa.Date(), nullable=False),
        sa.Column('nome_cliente', sa.Text(), nullable=False),
        sa.Column('cpf', sa.String(14), nullable=False),
        sa.Column('data_pagamento', sa.Date(), nullable=False),
        sa.Column('valor_pedido_portal', sa.Numeric(12, 2), nullable=False),
        sa.Column('valor_total_pago', sa.Numeric(12, 2), nullable=False),
        sa.Column('valor_devolver', sa.Numeric(12, 2), nullable=False),
        sa.Column('status', status_estorno, nullable=False, server_default='aguardando_comercial'),
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
    op.drop_table('solicitacoes_estorno')
    ENUM(name='statussolicitacaoestorno').drop(op.get_bind(), checkfirst=True)
    op.execute(
        "DELETE FROM configuracoes WHERE chave IN "
        "('tpl_novo_pedido_estorno', 'tpl_triagem_estorno', 'tpl_concluido_estorno')"
    )
