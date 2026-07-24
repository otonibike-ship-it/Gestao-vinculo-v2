"""carta de correcao: tabela cartas_correcao

Revision ID: 0009
Revises: 0008
Create Date: 2026-07-24
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON, ENUM

revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None

NOVOS_CONFIGS = [
    ("tpl_novo_pedido_carta", "Comercial, você tem uma nova carta de correção para análise: {numero_pedido} — Cliente: {nome_cliente} — Franquia: {franquia_nome}"),
    ("tpl_triagem_carta", "Você tem uma carta de correção para análise: {numero_pedido} — Cliente: {nome_cliente} — Franquia: {franquia_nome}"),
    ("tpl_concluido_carta", "Sua carta de correção foi concluída: {numero_pedido}"),
]


def upgrade() -> None:
    status_carta_correcao = ENUM(
        'aberto', 'aguardando_comercial', 'aguardando_faturamento',
        'aguardando_financeiro', 'aguardando_ti', 'fechado',
        name='statuscartacorrecao',
        create_type=False,
    )
    status_carta_correcao.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'cartas_correcao',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('franquia_id', sa.Integer(), sa.ForeignKey('empresas.id'), nullable=False, index=True),
        sa.Column('numero_nota_fiscal', sa.String(50), nullable=False),
        sa.Column('numero_pedido', sa.String(50), nullable=False, index=True),
        sa.Column('nome_cliente_pedido', sa.String(300), nullable=False),
        sa.Column('campo_correcao', sa.String(50), nullable=False),
        sa.Column('motivo_divergencia', sa.Text(), nullable=False),
        sa.Column('info_numero_serie_ticket', sa.Text(), nullable=True),
        sa.Column('nome_correto_cliente', sa.String(200), nullable=True),
        sa.Column('sobrenome_correto_cliente', sa.String(200), nullable=True),
        sa.Column('complemento_dados_adicionais', sa.String(300), nullable=True),
        sa.Column('status', status_carta_correcao, nullable=False, server_default='aguardando_comercial'),
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
    op.drop_table('cartas_correcao')
    ENUM(name='statuscartacorrecao').drop(op.get_bind(), checkfirst=True)
    op.execute(
        "DELETE FROM configuracoes WHERE chave IN "
        "('tpl_novo_pedido_carta', 'tpl_triagem_carta', 'tpl_concluido_carta')"
    )
