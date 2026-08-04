from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime, date
from decimal import Decimal
from enum import Enum


class StatusSolicitacaoEstorno(str, Enum):
    aberto = "aberto"
    aguardando_comercial = "aguardando_comercial"
    aguardando_faturamento = "aguardando_faturamento"
    aguardando_financeiro = "aguardando_financeiro"
    aguardando_ti = "aguardando_ti"
    fechado = "fechado"


class SolicitacaoEstornoCreate(BaseModel):
    franquia_id: int
    motivo: str
    vendedor: str
    numero_pedido: str
    data_pedido: date
    nome_cliente: str
    cpf: str
    data_pagamento: date
    valor_pedido_portal: Decimal
    valor_total_pago: Decimal
    valor_devolver: Decimal
    anexos: list[str] = []


class SolicitacaoEstornoResponse(BaseModel):
    id: int
    franquia_id: int
    franquia_nome: Optional[str] = None
    motivo: str
    vendedor: str
    numero_pedido: str
    data_pedido: date
    nome_cliente: str
    cpf: str
    data_pagamento: date
    valor_pedido_portal: Decimal
    valor_total_pago: Decimal
    valor_devolver: Decimal
    status: StatusSolicitacaoEstorno
    anexos: list[str] = []
    observacao_comercial: Optional[str] = None
    justificativa_reprovacao: Optional[str] = None
    destino_reprovacao: Optional[str] = None
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True


class AprovarEstornoRequest(BaseModel):
    observacao: Optional[str] = None
    anexos: list[str] = []


class ReprovarEstornoRequest(BaseModel):
    justificativa: str
    destino: Optional[Literal["comercial", "franquia"]] = None


class ReenviarEstornoRequest(BaseModel):
    franquia_id: int
    motivo: str
    vendedor: str
    numero_pedido: str
    data_pedido: date
    nome_cliente: str
    cpf: str
    data_pagamento: date
    valor_pedido_portal: Decimal
    valor_total_pago: Decimal
    valor_devolver: Decimal
    anexos: list[str] = []
