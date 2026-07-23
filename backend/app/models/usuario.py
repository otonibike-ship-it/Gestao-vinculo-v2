from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class PerfilUsuario(str, enum.Enum):
    comercial = "comercial"
    financeiro = "financeiro"
    ti = "ti"
    admin = "admin"
    franquia = "franquia"
    faturamento = "faturamento"


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, nullable=False, index=True)
    senha_hash = Column(String(255), nullable=False)
    perfil = Column(Enum(PerfilUsuario), nullable=False, default=PerfilUsuario.comercial)
    franquia_id = Column(Integer, ForeignKey("empresas.id", ondelete="SET NULL"), nullable=True)
    ativo = Column(Boolean, default=True)
    reset_token = Column(String(100), nullable=True)
    reset_token_expira_em = Column(DateTime(timezone=True), nullable=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
