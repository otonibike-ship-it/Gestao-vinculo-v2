from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class StatusCartaCorrecao(str, enum.Enum):
    aberto = "aberto"                              # retornado de reprovacao
    aguardando_comercial = "aguardando_comercial"   # triagem inicial
    aguardando_faturamento = "aguardando_faturamento"
    aguardando_financeiro = "aguardando_financeiro"
    aguardando_ti = "aguardando_ti"
    fechado = "fechado"


class CartaCorrecao(Base):
    __tablename__ = "cartas_correcao"

    id = Column(Integer, primary_key=True, index=True)
    franquia_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    numero_nota_fiscal = Column(String(50), nullable=False)
    numero_pedido = Column(String(50), nullable=False, index=True)
    nome_cliente_pedido = Column(String(300), nullable=False)
    campo_correcao = Column(String(50), nullable=False)       # numero_serie | nome_cliente | sobrenome_cliente | complemento_dados_adicionais
    motivo_divergencia = Column(Text, nullable=False)
    info_numero_serie_ticket = Column(Text, nullable=True)    # numero de serie correto + ticket S2 Tech Center (se aplicavel)
    nome_correto_cliente = Column(String(200), nullable=True)
    sobrenome_correto_cliente = Column(String(200), nullable=True)
    complemento_dados_adicionais = Column(String(300), nullable=True)
    status = Column(Enum(StatusCartaCorrecao), default=StatusCartaCorrecao.aguardando_comercial, nullable=False)
    anexos = Column(JSON, default=list)
    observacao_comercial = Column(Text, nullable=True)
    justificativa_reprovacao = Column(Text, nullable=True)
    destino_reprovacao = Column(String(50), nullable=True)  # franquia | comercial
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
