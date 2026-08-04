from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime
from enum import Enum


class StatusCartaCorrecao(str, Enum):
    aberto = "aberto"
    aguardando_comercial = "aguardando_comercial"
    aguardando_faturamento = "aguardando_faturamento"
    aguardando_financeiro = "aguardando_financeiro"
    aguardando_ti = "aguardando_ti"
    fechado = "fechado"


class CartaCorrecaoCreate(BaseModel):
    franquia_id: int
    numero_nota_fiscal: str
    numero_pedido: str
    nome_cliente_pedido: str
    campo_correcao: str
    motivo_divergencia: str
    info_numero_serie_ticket: Optional[str] = None
    nome_correto_cliente: Optional[str] = None
    sobrenome_correto_cliente: Optional[str] = None
    complemento_dados_adicionais: Optional[str] = None
    anexos: list[str] = []


class CartaCorrecaoResponse(BaseModel):
    id: int
    franquia_id: int
    franquia_nome: Optional[str] = None
    numero_nota_fiscal: str
    numero_pedido: str
    nome_cliente_pedido: str
    campo_correcao: str
    motivo_divergencia: str
    info_numero_serie_ticket: Optional[str] = None
    nome_correto_cliente: Optional[str] = None
    sobrenome_correto_cliente: Optional[str] = None
    complemento_dados_adicionais: Optional[str] = None
    status: StatusCartaCorrecao
    anexos: list[str] = []
    observacao_comercial: Optional[str] = None
    justificativa_reprovacao: Optional[str] = None
    destino_reprovacao: Optional[str] = None
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True


class AprovarCartaRequest(BaseModel):
    observacao: Optional[str] = None
    anexos: list[str] = []


class ReprovarCartaRequest(BaseModel):
    justificativa: str
    destino: Optional[Literal["comercial", "franquia"]] = None


class ReenviarCartaRequest(BaseModel):
    franquia_id: int
    numero_nota_fiscal: str
    numero_pedido: str
    nome_cliente_pedido: str
    campo_correcao: str
    motivo_divergencia: str
    info_numero_serie_ticket: Optional[str] = None
    nome_correto_cliente: Optional[str] = None
    sobrenome_correto_cliente: Optional[str] = None
    complemento_dados_adicionais: Optional[str] = None
    anexos: list[str] = []
