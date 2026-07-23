from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class Configuracao(Base):
    __tablename__ = "configuracoes"

    chave = Column(String(100), primary_key=True)
    valor = Column(Text, nullable=True)
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
