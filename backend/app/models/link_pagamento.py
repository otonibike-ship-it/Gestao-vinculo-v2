from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Text, Date, Numeric
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class StatusLinkPagamento(str, enum.Enum):
    aberto = "aberto"                              # retornado de reprovacao
    aguardando_comercial = "aguardando_comercial"   # triagem inicial
    aguardando_faturamento = "aguardando_faturamento"
    aguardando_financeiro = "aguardando_financeiro"
    aguardando_ti = "aguardando_ti"
    fechado = "fechado"


class LinkPagamento(Base):
    __tablename__ = "links_pagamento"

    id = Column(Integer, primary_key=True, index=True)
    franquia_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    motivo = Column(Text, nullable=False)
    numero_pedido = Column(String(50), nullable=False, index=True)
    data_pedido = Column(Date, nullable=False)
    valor_pedido = Column(Numeric(12, 2), nullable=False)
    valor_link = Column(Numeric(12, 2), nullable=False)
    quantidade_parcelas = Column(Integer, nullable=False)  # 1 a 18
    codigo_produto = Column(String(100), nullable=False)   # ID da bicicleta
    modelo = Column(Text, nullable=False)
    vendedor = Column(String(200), nullable=False)
    nome_cliente = Column(Text, nullable=False)
    cpf = Column(String(14), nullable=False)
    email = Column(String(200), nullable=False)
    endereco = Column(Text, nullable=False)
    telefone = Column(String(20), nullable=False)
    status = Column(Enum(StatusLinkPagamento), default=StatusLinkPagamento.aguardando_comercial, nullable=False)
    anexos = Column(JSON, default=list)
    observacao_comercial = Column(Text, nullable=True)
    justificativa_reprovacao = Column(Text, nullable=True)
    destino_reprovacao = Column(String(50), nullable=True)  # sempre "franquia"
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
