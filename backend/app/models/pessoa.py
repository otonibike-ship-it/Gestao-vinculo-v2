from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class Empresa(Base):
    __tablename__ = "empresas"

    id = Column(Integer, primary_key=True, index=True)
    razao_social = Column(String(300), nullable=False)
    cnpj = Column(String(18), unique=True, nullable=False, index=True)
    nome_fantasia = Column(String(200), nullable=True)
    email = Column(String(200), nullable=True)
    telefone = Column(String(20), nullable=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
