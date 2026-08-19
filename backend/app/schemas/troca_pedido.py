from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
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
    motivo_detalhado: str
    nome_vendedor: str
    numero_pedido_cancelar: str
    data_pedido_cancelar: date
    codigo_produto_cancelar: str
    descricao_pedido_cancelar: str
    numero_novo_pedido: str
    codigo_produto_novo: str
    descricao_novo_pedido: str
    status_portal: str
    nome_cliente: str
    cpf: str
    valor_novo_pedido: Decimal
    valor_pago_cliente: Decimal
    anexos: list[str] = []


class TrocaPedidoResponse(BaseModel):
    id: int
    franquia_id: int
    franquia_nome: Optional[str] = None
    motivo: str
    motivo_detalhado: Optional[str] = None
    nome_vendedor: str
    numero_pedido_cancelar: str
    data_pedido_cancelar: date
    codigo_produto_cancelar: str
    descricao_pedido_cancelar: str
    numero_novo_pedido: str
    codigo_produto_novo: str
    descricao_novo_pedido: str
    status_portal: str
    nome_cliente: Optional[str] = None
    cpf: Optional[str] = None
    valor_novo_pedido: Optional[Decimal] = None
    valor_pago_cliente: Optional[Decimal] = None
    status: StatusTrocaPedido
    anexos: list[str] = []
    observacao_comercial: Optional[str] = None
    observacao_faturamento: Optional[str] = None
    justificativa_reprovacao: Optional[str] = None
    destino_reprovacao: Optional[str] = None
    historico_observacoes: list[dict] = []
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True


class AprovarTrocaRequest(BaseModel):
    observacao: Optional[str] = None
    anexos: list[str] = []
    destino: Optional[str] = None  # comercial | faturamento | ti | concluir


class ReprovarTrocaRequest(BaseModel):
    justificativa: Optional[str] = None
    destino: Optional[str] = None  # comercial | faturamento | ti | franquia


class ReenviarTrocaRequest(BaseModel):
    franquia_id: int
    motivo: str
    motivo_detalhado: str
    nome_vendedor: str
    numero_pedido_cancelar: str
    data_pedido_cancelar: date
    codigo_produto_cancelar: str
    descricao_pedido_cancelar: str
    numero_novo_pedido: str
    codigo_produto_novo: str
    descricao_novo_pedido: str
    status_portal: str
    nome_cliente: str
    cpf: str
    valor_novo_pedido: Decimal
    valor_pago_cliente: Decimal
    anexos: list[str] = []
