from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Text, Date, Numeric, Boolean
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class StatusCancelamentoVenda(str, enum.Enum):
    aberto = "aberto"                              # retornado de reprovacao
    aguardando_comercial = "aguardando_comercial"   # triagem inicial
    aguardando_faturamento = "aguardando_faturamento"
    aguardando_financeiro = "aguardando_financeiro"
    aguardando_ti = "aguardando_ti"
    fechado = "fechado"


class CancelamentoVenda(Base):
    __tablename__ = "cancelamentos_venda"

    id = Column(Integer, primary_key=True, index=True)
    franquia_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    motivo = Column(Text, nullable=False)
    vendedor = Column(String(200), nullable=False)
    numero_pedido_cancelar = Column(String(50), nullable=False, index=True)
    data_pedido_cancelar = Column(Date, nullable=False)
    status_portal = Column(String(50), nullable=False)  # processando_pagamento | em_separacao | faturado
    numero_nota_fiscal = Column(String(50), nullable=False)
    data_emissao_nota_fiscal = Column(Date, nullable=False)
    bike_na_loja = Column(Boolean, nullable=False)
    sinais_uso = Column(Boolean, nullable=False)
    anexos_evidencias_uso = Column(JSON, default=list)   # fotos dos sinais de uso da bike
    codigo_produto = Column(String(100), nullable=False)
    descricao_modelo = Column(Text, nullable=False)
    nome_cliente = Column(Text, nullable=False)
    cpf = Column(String(14), nullable=False)
    valor_total_pago_cliente = Column(Numeric(12, 2), nullable=False)
    valor_total_pedido = Column(Numeric(12, 2), nullable=False)
    valor_cancelar = Column(Numeric(12, 2), nullable=False)
    forma_pagamento = Column(String(50), nullable=False)  # debito | credito | pix | deposito
    pago_mais_um_cartao = Column(Boolean, nullable=False)
    anexos_portal_comprovante = Column(JSON, default=list)  # imagens do portal + comprovante de pagamento
    status = Column(Enum(StatusCancelamentoVenda), default=StatusCancelamentoVenda.aguardando_comercial, nullable=False)
    observacao_comercial = Column(Text, nullable=True)
    justificativa_reprovacao = Column(Text, nullable=True)
    destino_reprovacao = Column(String(50), nullable=True)  # franquia | comercial
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
