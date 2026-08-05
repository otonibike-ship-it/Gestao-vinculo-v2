from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Text, Date, Numeric
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class StatusTrocaPedido(str, enum.Enum):
    aberto = "aberto"                              # retornado de reprovacao
    aguardando_comercial = "aguardando_comercial"   # triagem inicial
    aguardando_faturamento = "aguardando_faturamento"
    aguardando_financeiro = "aguardando_financeiro"
    aguardando_ti = "aguardando_ti"
    fechado = "fechado"


class TrocaPedido(Base):
    __tablename__ = "troca_pedidos"

    id = Column(Integer, primary_key=True, index=True)
    franquia_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    motivo = Column(String(500), nullable=False)
    motivo_detalhado = Column(Text, nullable=True)
    nome_vendedor = Column(String(200), nullable=False)
    numero_pedido_cancelar = Column(String(50), nullable=False, index=True)
    data_pedido_cancelar = Column(Date, nullable=False)
    codigo_produto_cancelar = Column(String(100), nullable=False)
    descricao_pedido_cancelar = Column(Text, nullable=False)
    numero_novo_pedido = Column(String(50), nullable=False)
    codigo_produto_novo = Column(String(100), nullable=False)
    descricao_novo_pedido = Column(Text, nullable=False)
    status_portal = Column(String(50), nullable=False)  # processando_pagamento | em_separacao | faturado
    nome_cliente = Column(String(300), nullable=True)
    cpf = Column(String(14), nullable=True)
    valor_novo_pedido = Column(Numeric(12, 2), nullable=True)
    valor_pago_cliente = Column(Numeric(12, 2), nullable=True)
    status = Column(Enum(StatusTrocaPedido), default=StatusTrocaPedido.aguardando_comercial, nullable=False)
    anexos = Column(JSON, default=list)
    observacao_comercial = Column(Text, nullable=True)
    observacao_faturamento = Column(Text, nullable=True)
    justificativa_reprovacao = Column(Text, nullable=True)
    destino_reprovacao = Column(String(50), nullable=True)  # franquia | comercial
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
