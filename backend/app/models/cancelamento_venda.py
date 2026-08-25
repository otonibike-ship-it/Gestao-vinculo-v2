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
    motivo = Column(Text, nullable=True)
    vendedor = Column(String(200), nullable=True)
    numero_pedido_cancelar = Column(String(50), nullable=True, index=True)
    data_pedido_cancelar = Column(Date, nullable=True)
    status_portal = Column(String(50), nullable=True)  # processando_pagamento | em_separacao | faturado
    numero_nota_fiscal = Column(String(50), nullable=True)
    data_emissao_nota_fiscal = Column(Date, nullable=True)
    bike_na_loja = Column(Boolean, nullable=True)
    sinais_uso = Column(Boolean, nullable=True)
    anexos_evidencias_uso = Column(JSON, default=list)   # fotos dos sinais de uso da bike
    codigo_produto = Column(String(100), nullable=True)
    descricao_modelo = Column(Text, nullable=True)
    nome_cliente = Column(Text, nullable=True)
    cpf = Column(String(14), nullable=True)
    valor_total_pago_cliente = Column(Numeric(12, 2), nullable=True)
    valor_total_pedido = Column(Numeric(12, 2), nullable=True)
    valor_cancelar = Column(Numeric(12, 2), nullable=True)
    forma_pagamento = Column(String(50), nullable=True)  # debito | credito | pix | deposito
    pago_mais_um_cartao = Column(Boolean, nullable=True)
    anexos_portal_comprovante = Column(JSON, default=list)  # imagens do portal + comprovante de pagamento
    status = Column(Enum(StatusCancelamentoVenda), default=StatusCancelamentoVenda.aguardando_comercial, nullable=False)
    observacao_comercial = Column(Text, nullable=True)
    justificativa_reprovacao = Column(Text, nullable=True)
    destino_reprovacao = Column(String(50), nullable=True)  # franquia | comercial
    historico_observacoes = Column(JSON, default=list)  # log [{area, texto, tipo, data}]
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
