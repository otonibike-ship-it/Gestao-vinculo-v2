from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Text, Date, Numeric
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class StatusSolicitacaoEstorno(str, enum.Enum):
    aberto = "aberto"                              # retornado de reprovacao
    aguardando_comercial = "aguardando_comercial"   # triagem inicial
    aguardando_faturamento = "aguardando_faturamento"
    aguardando_financeiro = "aguardando_financeiro"
    aguardando_ti = "aguardando_ti"
    fechado = "fechado"


class SolicitacaoEstorno(Base):
    __tablename__ = "solicitacoes_estorno"

    id = Column(Integer, primary_key=True, index=True)
    franquia_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    motivo = Column(Text, nullable=False)
    vendedor = Column(String(200), nullable=False)
    numero_pedido = Column(String(50), nullable=True, index=True)  # opcional: pode ser so um sinal/garantia, sem pedido
    data_pedido = Column(Date, nullable=False)
    nome_cliente = Column(Text, nullable=False)
    cpf = Column(String(14), nullable=False)
    data_pagamento = Column(Date, nullable=False)
    valor_pedido_portal = Column(Numeric(12, 2), nullable=True)  # opcional: pode ser so um sinal/garantia, sem pedido
    valor_total_pago = Column(Numeric(12, 2), nullable=False)
    valor_devolver = Column(Numeric(12, 2), nullable=False)
    status = Column(Enum(StatusSolicitacaoEstorno), default=StatusSolicitacaoEstorno.aguardando_comercial, nullable=False)
    anexos = Column(JSON, default=list)
    observacao_comercial = Column(Text, nullable=True)
    justificativa_reprovacao = Column(Text, nullable=True)
    destino_reprovacao = Column(String(50), nullable=True)  # franquia | comercial
    historico_observacoes = Column(JSON, default=list)  # log [{area, texto, tipo, data}]
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
