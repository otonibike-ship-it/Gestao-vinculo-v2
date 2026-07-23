"""franquia workflow: novo perfil, status comercial, cupons

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-09
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ALTER TYPE nao pode rodar dentro de uma transacao no PostgreSQL.
    # Encerramos a transacao atual, adicionamos os valores e abrimos nova.
    connection = op.get_bind()
    connection.execute(sa.text("COMMIT"))
    connection.execute(sa.text("ALTER TYPE perfilusuario ADD VALUE IF NOT EXISTS 'franquia'"))
    connection.execute(sa.text("ALTER TYPE statusvinculo ADD VALUE IF NOT EXISTS 'validacao_comercial'"))
    connection.execute(sa.text("BEGIN"))

    # Adiciona franquia_id em usuarios (FK para empresas)
    op.add_column("usuarios", sa.Column("franquia_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_usuario_franquia", "usuarios", "empresas", ["franquia_id"], ["id"], ondelete="SET NULL"
    )

    # Campos de cupons e reprovacao em vinculos
    op.add_column("vinculos", sa.Column("quantidade_cupons", sa.Integer(), nullable=True))
    op.add_column("vinculos", sa.Column("cupons", JSON(), nullable=True))
    op.add_column("vinculos", sa.Column("destino_reprovacao", sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column("vinculos", "destino_reprovacao")
    op.drop_column("vinculos", "cupons")
    op.drop_column("vinculos", "quantidade_cupons")
    op.drop_constraint("fk_usuario_franquia", "usuarios", type_="foreignkey")
    op.drop_column("usuarios", "franquia_id")
    # Nao e possivel remover valores de enum no PostgreSQL sem recriar o tipo
