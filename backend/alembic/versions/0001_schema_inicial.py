"""schema inicial v2

Revision ID: 0001
Revises:
Create Date: 2026-03-17
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Tabela usuarios (enum perfilusuario criado automaticamente pelo SQLAlchemy)
    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("nome", sa.String(200), nullable=False),
        sa.Column("email", sa.String(200), nullable=False, unique=True, index=True),
        sa.Column("senha_hash", sa.String(255), nullable=False),
        sa.Column("perfil", sa.Enum("comercial", "financeiro", "ti", "admin", name="perfilusuario"), nullable=False, server_default="comercial"),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Tabela empresas (franquias)
    op.create_table(
        "empresas",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("razao_social", sa.String(300), nullable=False),
        sa.Column("cnpj", sa.String(18), nullable=False, unique=True, index=True),
        sa.Column("nome_fantasia", sa.String(200), nullable=True),
        sa.Column("email", sa.String(200), nullable=True),
        sa.Column("telefone", sa.String(20), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Tabela vinculos
    op.create_table(
        "vinculos",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("numero_pedido", sa.String(50), nullable=False, unique=True, index=True),
        sa.Column("franquia_id", sa.Integer(), sa.ForeignKey("empresas.id"), nullable=False, index=True),
        sa.Column("nome_cliente", sa.String(300), nullable=False),
        sa.Column("valor_pedido", sa.Numeric(12, 2), nullable=False),
        sa.Column("data_pedido", sa.Date(), nullable=False),
        sa.Column("necessario_validacao", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("status", sa.Enum("aberto", "validacao_financeiro", "tarefa_ti", "fechado", name="statusvinculo"), nullable=False, server_default="aberto"),
        sa.Column("anexos", JSON(), nullable=True),
        sa.Column("justificativa_reprovacao", sa.Text(), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("vinculos")
    op.drop_table("empresas")
    op.drop_table("usuarios")
    op.execute("DROP TYPE IF EXISTS statusvinculo")
    op.execute("DROP TYPE IF EXISTS perfilusuario")
