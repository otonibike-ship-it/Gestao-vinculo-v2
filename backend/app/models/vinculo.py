from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Text, Numeric, Date, Boolean
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class StatusVinculo(str, enum.Enum):
    aberto = "aberto"                              # novo pedido / retornado de reprovacao
    validacao_comercial = "validacao_comercial"    # aguardando comercial
    validacao_financeiro = "validacao_financeiro"  # aguardando financeiro
    tarefa_ti = "tarefa_ti"                        # aguardando TI
    fechado = "fechado"                            # vinculado / concluido


class Vinculo(Base):
    __tablename__ = "vinculos"

    id = Column(Integer, primary_key=True, index=True)
    numero_pedido = Column(String(50), unique=True, nullable=False, index=True)
    franquia_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    nome_cliente = Column(String(300), nullable=False)
    cpf = Column(String(14), nullable=True)
    valor_pedido = Column(Numeric(12, 2), nullable=False)
    data_pedido = Column(Date, nullable=False)
    motivo = Column(String(500), nullable=True)
    necessario_validacao = Column(Boolean, default=False, nullable=False)
    quantidade_cupons = Column(Integer, nullable=True)
    cupons = Column(JSON, nullable=True)            # [{valor: float}]
    status = Column(Enum(StatusVinculo), default=StatusVinculo.validacao_comercial, nullable=False)
    anexos = Column(JSON, default=list)
    justificativa_reprovacao = Column(Text, nullable=True)
    destino_reprovacao = Column(String(50), nullable=True)  # franquia | comercial | financeiro
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
