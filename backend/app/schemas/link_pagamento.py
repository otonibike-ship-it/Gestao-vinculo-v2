from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime, date
from decimal import Decimal
from enum import Enum


class StatusLinkPagamento(str, Enum):
    aberto = "aberto"
    aguardando_comercial = "aguardando_comercial"
    aguardando_faturamento = "aguardando_faturamento"
    aguardando_financeiro = "aguardando_financeiro"
    aguardando_ti = "aguardando_ti"
    fechado = "fechado"


class LinkPagamentoCreate(BaseModel):
    franquia_id: int
    motivo: str
    numero_pedido: str
    data_pedido: date
    valor_pedido: Decimal
    valor_link: Decimal
    quantidade_parcelas: int
    codigo_produto: str
    modelo: str
    vendedor: str
    nome_cliente: str
    cpf: str
    email: str
    endereco: str
    telefone: str
    anexos: list[str] = []


class LinkPagamentoResponse(BaseModel):
    id: int
    franquia_id: int
    franquia_nome: Optional[str] = None
    motivo: str
    numero_pedido: str
    data_pedido: date
    valor_pedido: Decimal
    valor_link: Decimal
    quantidade_parcelas: int
    codigo_produto: str
    modelo: str
    vendedor: str
    nome_cliente: str
    cpf: str
    email: str
    endereco: str
    telefone: str
    status: StatusLinkPagamento
    anexos: list[str] = []
    observacao_comercial: Optional[str] = None
    link_gerado: Optional[str] = None
    justificativa_reprovacao: Optional[str] = None
    destino_reprovacao: Optional[str] = None
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True


class AprovarLinkRequest(BaseModel):
    observacao: Optional[str] = None  # obrigatorio na etapa comercial
    link_gerado: Optional[str] = None  # obrigatorio na etapa financeiro
    anexos: list[str] = []


class ReprovarLinkRequest(BaseModel):
    justificativa: str
    destino: Optional[Literal["comercial", "franquia"]] = None


class ReenviarLinkRequest(BaseModel):
    franquia_id: int
    motivo: str
    numero_pedido: str
    data_pedido: date
    valor_pedido: Decimal
    valor_link: Decimal
    quantidade_parcelas: int
    codigo_produto: str
    modelo: str
    vendedor: str
    nome_cliente: str
    cpf: str
    email: str
    endereco: str
    telefone: str
    anexos: list[str] = []
