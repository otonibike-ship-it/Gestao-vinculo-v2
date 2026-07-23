from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
from enum import Enum


class StatusVinculo(str, Enum):
    aberto = "aberto"
    validacao_comercial = "validacao_comercial"
    validacao_financeiro = "validacao_financeiro"
    tarefa_ti = "tarefa_ti"
    fechado = "fechado"


class CupomItem(BaseModel):
    valor: Decimal


class VinculoCreate(BaseModel):
    numero_pedido: str
    franquia_id: int
    nome_cliente: str
    cpf: Optional[str] = None
    valor_pedido: Decimal
    data_pedido: date
    motivo: Optional[str] = None
    necessario_validacao: bool = False
    quantidade_cupons: Optional[int] = None
    cupons: Optional[list[CupomItem]] = None
    anexos: list[str] = []


class VinculoResponse(BaseModel):
    id: int
    numero_pedido: str
    franquia_id: int
    franquia_nome: Optional[str] = None
    nome_cliente: str
    cpf: Optional[str] = None
    valor_pedido: Decimal
    data_pedido: date
    motivo: Optional[str] = None
    necessario_validacao: bool
    quantidade_cupons: Optional[int] = None
    cupons: Optional[list] = None
    status: StatusVinculo
    anexos: list[str] = []
    justificativa_reprovacao: Optional[str] = None
    destino_reprovacao: Optional[str] = None
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True


class AprovarRequest(BaseModel):
    anexos: list[str] = []
    necessario_financeiro: Optional[bool] = None  # comercial pode sobrescrever


class ReprovarRequest(BaseModel):
    justificativa: str
    destino: str = "franquia"  # franquia | comercial | financeiro


class ReenviarRequest(BaseModel):
    franquia_id: int
    nome_cliente: str
    cpf: Optional[str] = None
    valor_pedido: Decimal
    data_pedido: date
    motivo: Optional[str] = None
    necessario_validacao: bool = False
    quantidade_cupons: Optional[int] = None
    cupons: Optional[list[CupomItem]] = None
    anexos: list[str] = []
