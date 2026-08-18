from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime, date
from decimal import Decimal
from enum import Enum


class StatusCancelamentoVenda(str, Enum):
    aberto = "aberto"
    aguardando_comercial = "aguardando_comercial"
    aguardando_faturamento = "aguardando_faturamento"
    aguardando_financeiro = "aguardando_financeiro"
    aguardando_ti = "aguardando_ti"
    fechado = "fechado"


class CancelamentoVendaCreate(BaseModel):
    franquia_id: int
    motivo: str
    vendedor: str
    numero_pedido_cancelar: str
    data_pedido_cancelar: date
    status_portal: str
    numero_nota_fiscal: str
    data_emissao_nota_fiscal: date
    bike_na_loja: bool
    sinais_uso: bool
    anexos_evidencias_uso: list[str] = []
    codigo_produto: str
    descricao_modelo: str
    nome_cliente: str
    cpf: str
    valor_total_pago_cliente: Decimal
    valor_total_pedido: Decimal
    valor_cancelar: Decimal
    forma_pagamento: str
    pago_mais_um_cartao: bool
    anexos_portal_comprovante: list[str] = []


class CancelamentoVendaResponse(BaseModel):
    id: int
    franquia_id: int
    franquia_nome: Optional[str] = None
    motivo: str
    vendedor: str
    numero_pedido_cancelar: str
    data_pedido_cancelar: date
    status_portal: str
    numero_nota_fiscal: str
    data_emissao_nota_fiscal: date
    bike_na_loja: bool
    sinais_uso: bool
    anexos_evidencias_uso: list[str] = []
    codigo_produto: str
    descricao_modelo: str
    nome_cliente: str
    cpf: str
    valor_total_pago_cliente: Decimal
    valor_total_pedido: Decimal
    valor_cancelar: Decimal
    forma_pagamento: str
    pago_mais_um_cartao: bool
    anexos_portal_comprovante: list[str] = []
    status: StatusCancelamentoVenda
    observacao_comercial: Optional[str] = None
    justificativa_reprovacao: Optional[str] = None
    destino_reprovacao: Optional[str] = None
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True


class AprovarCancelamentoRequest(BaseModel):
    observacao: Optional[str] = None
    anexos: list[str] = []  # anexados na etapa de faturamento/financeiro, entram em anexos_portal_comprovante


class ReprovarCancelamentoRequest(BaseModel):
    justificativa: str
    destino: Optional[Literal["comercial", "franquia"]] = None


class ReenviarCancelamentoRequest(BaseModel):
    franquia_id: int
    motivo: str
    vendedor: str
    numero_pedido_cancelar: str
    data_pedido_cancelar: date
    status_portal: str
    numero_nota_fiscal: str
    data_emissao_nota_fiscal: date
    bike_na_loja: bool
    sinais_uso: bool
    anexos_evidencias_uso: list[str] = []
    codigo_produto: str
    descricao_modelo: str
    nome_cliente: str
    cpf: str
    valor_total_pago_cliente: Decimal
    valor_total_pedido: Decimal
    valor_cancelar: Decimal
    forma_pagamento: str
    pago_mais_um_cartao: bool
    anexos_portal_comprovante: list[str] = []
