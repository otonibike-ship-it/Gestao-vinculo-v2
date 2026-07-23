from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime, date
from enum import Enum


class StatusTrocaPedido(str, Enum):
    aberto = "aberto"
    aguardando_comercial = "aguardando_comercial"
    aguardando_faturamento = "aguardando_faturamento"
    aguardando_financeiro = "aguardando_financeiro"
    aguardando_ti = "aguardando_ti"
    fechado = "fechado"


class TrocaPedidoCreate(BaseModel):
    franquia_id: int
    motivo: str
    nome_vendedor: str
    numero_pedido_cancelar: str
    data_pedido_cancelar: date
    codigo_produto_cancelar: str
    descricao_pedido_cancelar: str
    numero_novo_pedido: str
    codigo_produto_novo: str
    descricao_novo_pedido: str
    status_portal: str
    anexos: list[str] = []


class TrocaPedidoResponse(BaseModel):
    id: int
    franquia_id: int
    franquia_nome: Optional[str] = None
    motivo: str
    nome_vendedor: str
    numero_pedido_cancelar: str
    data_pedido_cancelar: date
    codigo_produto_cancelar: str
    descricao_pedido_cancelar: str
    numero_novo_pedido: str
    codigo_produto_novo: str
    descricao_novo_pedido: str
    status_portal: str
    status: StatusTrocaPedido
    anexos: list[str] = []
    observacao_comercial: Optional[str] = None
    justificativa_reprovacao: Optional[str] = None
    destino_reprovacao: Optional[str] = None
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True


class AprovarTrocaRequest(BaseModel):
    destino: Optional[Literal["faturamento", "financeiro", "ti"]] = None  # obrigatorio na etapa comercial
    observacao: Optional[str] = None
    anexos: list[str] = []


class ReprovarTrocaRequest(BaseModel):
    justificativa: str


class ReenviarTrocaRequest(BaseModel):
    franquia_id: int
    motivo: str
    nome_vendedor: str
    numero_pedido_cancelar: str
    data_pedido_cancelar: date
    codigo_produto_cancelar: str
    descricao_pedido_cancelar: str
    numero_novo_pedido: str
    codigo_produto_novo: str
    descricao_novo_pedido: str
    status_portal: str
    anexos: list[str] = []
