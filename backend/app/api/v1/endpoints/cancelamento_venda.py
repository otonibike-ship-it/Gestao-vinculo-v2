import logging
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.core.database import get_db
from app.models.cancelamento_venda import CancelamentoVenda, StatusCancelamentoVenda
from app.models.pessoa import Empresa
from app.models.usuario import Usuario, PerfilUsuario
from app.models.configuracao import Configuracao
from app.schemas.cancelamento_venda import (
    CancelamentoVendaCreate,
    AprovarCancelamentoRequest,
    ReprovarCancelamentoRequest,
    ReenviarCancelamentoRequest,
)
from app.services import email as email_svc

logger = logging.getLogger(__name__)

router = APIRouter()

_AREA_STATUS = {
    "comercial": StatusCancelamentoVenda.aguardando_comercial,
    "faturamento": StatusCancelamentoVenda.aguardando_faturamento,
    "financeiro": StatusCancelamentoVenda.aguardando_financeiro,
}
_AREA_EMAIL_CONFIG = {
    "comercial": "email_comercial",
    "faturamento": "email_faturamento",
    "financeiro": "email_financeiro",
}
_FINAL_AREA = "financeiro"


def _area_atual(cancelamento_status: StatusCancelamentoVenda) -> Optional[str]:
    for area, s in _AREA_STATUS.items():
        if s == cancelamento_status:
            return area
    return None


def _registrar_nota(cancelamento: CancelamentoVenda, area: str, texto: Optional[str], tipo: str):
    if not texto or not texto.strip():
        return
    historico = list(cancelamento.historico_observacoes or [])
    historico.append({
        "area": area,
        "texto": texto.strip(),
        "tipo": tipo,
        "data": datetime.now(timezone.utc).isoformat(),
    })
    cancelamento.historico_observacoes = historico


def _serialize(c: CancelamentoVenda, empresa: Empresa | None = None) -> dict:
    return {
        "id": c.id,
        "franquia_id": c.franquia_id,
        "franquia_nome": empresa.nome_fantasia or empresa.razao_social if empresa else "—",
        "motivo": c.motivo,
        "vendedor": c.vendedor,
        "numero_pedido_cancelar": c.numero_pedido_cancelar,
        "data_pedido_cancelar": c.data_pedido_cancelar.isoformat() if c.data_pedido_cancelar else None,
        "status_portal": c.status_portal,
        "numero_nota_fiscal": c.numero_nota_fiscal,
        "data_emissao_nota_fiscal": c.data_emissao_nota_fiscal.isoformat() if c.data_emissao_nota_fiscal else None,
        "bike_na_loja": c.bike_na_loja,
        "sinais_uso": c.sinais_uso,
        "anexos_evidencias_uso": c.anexos_evidencias_uso or [],
        "codigo_produto": c.codigo_produto,
        "descricao_modelo": c.descricao_modelo,
        "nome_cliente": c.nome_cliente,
        "cpf": c.cpf,
        "valor_total_pago_cliente": c.valor_total_pago_cliente,
        "valor_total_pedido": c.valor_total_pedido,
        "valor_cancelar": c.valor_cancelar,
        "forma_pagamento": c.forma_pagamento,
        "pago_mais_um_cartao": c.pago_mais_um_cartao,
        "anexos_portal_comprovante": c.anexos_portal_comprovante or [],
        "status": c.status.value if c.status else None,
        "observacao_comercial": c.observacao_comercial,
        "justificativa_reprovacao": c.justificativa_reprovacao,
        "destino_reprovacao": c.destino_reprovacao,
        "historico_observacoes": c.historico_observacoes or [],
        "criado_em": c.criado_em.isoformat() if c.criado_em else None,
        "atualizado_em": c.atualizado_em.isoformat() if c.atualizado_em else None,
    }


async def _enrich(c: CancelamentoVenda, db: AsyncSession) -> dict:
    empresa_result = await db.execute(select(Empresa).where(Empresa.id == c.franquia_id))
    empresa = empresa_result.scalar_one_or_none()
    return _serialize(c, empresa)


@router.get("")
async def listar_cancelamentos(
    status_filter: Optional[str] = Query(None, alias="status"),
    franquia_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    query = select(CancelamentoVenda)
    if status_filter:
        query = query.where(CancelamentoVenda.status == status_filter)
    if franquia_id:
        query = query.where(CancelamentoVenda.franquia_id == franquia_id)
    query = query.order_by(CancelamentoVenda.criado_em.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    cancelamentos = result.scalars().all()

    if cancelamentos:
        franquia_ids = list({c.franquia_id for c in cancelamentos})
        emp_result = await db.execute(select(Empresa).where(Empresa.id.in_(franquia_ids)))
        empresas_map = {e.id: e for e in emp_result.scalars().all()}
    else:
        empresas_map = {}

    return [_serialize(c, empresas_map.get(c.franquia_id)) for c in cancelamentos]


@router.get("/{cancelamento_id}")
async def obter_cancelamento(cancelamento_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CancelamentoVenda).where(CancelamentoVenda.id == cancelamento_id))
    cancelamento = result.scalar_one_or_none()
    if not cancelamento:
        raise HTTPException(status_code=404, detail="Cancelamento de venda não encontrado")
    return await _enrich(cancelamento, db)


@router.post("", status_code=status.HTTP_201_CREATED)
async def criar_cancelamento(payload: CancelamentoVendaCreate, db: AsyncSession = Depends(get_db)):
    emp = await db.scalar(select(Empresa).where(Empresa.id == payload.franquia_id))
    if not emp:
        raise HTTPException(status_code=422, detail=f"Franquia {payload.franquia_id} não encontrada")

    cancelamento = CancelamentoVenda(
        franquia_id=payload.franquia_id,
        motivo=payload.motivo,
        vendedor=payload.vendedor,
        numero_pedido_cancelar=payload.numero_pedido_cancelar,
        data_pedido_cancelar=payload.data_pedido_cancelar,
        status_portal=payload.status_portal,
        numero_nota_fiscal=payload.numero_nota_fiscal,
        data_emissao_nota_fiscal=payload.data_emissao_nota_fiscal,
        bike_na_loja=payload.bike_na_loja,
        sinais_uso=payload.sinais_uso,
        anexos_evidencias_uso=payload.anexos_evidencias_uso,
        codigo_produto=payload.codigo_produto,
        descricao_modelo=payload.descricao_modelo,
        nome_cliente=payload.nome_cliente,
        cpf=payload.cpf,
        valor_total_pago_cliente=payload.valor_total_pago_cliente,
        valor_total_pedido=payload.valor_total_pedido,
        valor_cancelar=payload.valor_cancelar,
        forma_pagamento=payload.forma_pagamento,
        pago_mais_um_cartao=payload.pago_mais_um_cartao,
        anexos_portal_comprovante=payload.anexos_portal_comprovante,
        status=StatusCancelamentoVenda.aguardando_comercial,
    )
    db.add(cancelamento)
    await db.flush()
    await db.refresh(cancelamento)
    result = await _enrich(cancelamento, db)

    asyncio.create_task(email_svc.notificar_novo_pedido_cancelamento(
        payload.numero_pedido_cancelar, payload.vendedor, result.get("franquia_nome", "")
    ))
    return result


@router.put("/{cancelamento_id}/aprovar")
async def aprovar_cancelamento(cancelamento_id: int, payload: AprovarCancelamentoRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CancelamentoVenda).where(CancelamentoVenda.id == cancelamento_id))
    cancelamento = result.scalar_one_or_none()
    if not cancelamento:
        raise HTTPException(status_code=404, detail="Cancelamento de venda não encontrado")

    area_atual = _area_atual(cancelamento.status)
    if area_atual is None:
        raise HTTPException(status_code=400, detail=f"Não é possível aprovar com status '{cancelamento.status.value}'")

    _registrar_nota(cancelamento, area_atual, payload.observacao, "aprovacao")
    if area_atual == "comercial":
        cancelamento.observacao_comercial = payload.observacao

    if payload.destino == "concluir":
        if area_atual != _FINAL_AREA:
            raise HTTPException(status_code=422, detail=f"Só é possível concluir a partir de {_FINAL_AREA}")
        cancelamento.status = StatusCancelamentoVenda.fechado
    elif payload.destino:
        if payload.destino not in _AREA_STATUS or payload.destino == area_atual:
            raise HTTPException(status_code=422, detail="destino inválido")
        cancelamento.status = _AREA_STATUS[payload.destino]
    else:
        # Sem destino explícito: segue o próximo passo padrão
        if area_atual == "comercial":
            cancelamento.status = StatusCancelamentoVenda.aguardando_faturamento
        elif area_atual == "faturamento":
            cancelamento.status = StatusCancelamentoVenda.aguardando_financeiro
        elif area_atual == "financeiro":
            cancelamento.status = StatusCancelamentoVenda.fechado

    if payload.anexos:
        cancelamento.anexos_portal_comprovante = (cancelamento.anexos_portal_comprovante or []) + payload.anexos

    cancelamento.justificativa_reprovacao = None
    cancelamento.destino_reprovacao = None
    await db.flush()
    await db.refresh(cancelamento)
    result = await _enrich(cancelamento, db)

    franquia_nome = result.get("franquia_nome", "")
    numero = cancelamento.numero_pedido_cancelar
    vendedor = cancelamento.vendedor
    novo_status = cancelamento.status
    if novo_status == StatusCancelamentoVenda.fechado:
        u = await db.scalar(select(Usuario).where(
            Usuario.franquia_id == cancelamento.franquia_id,
            Usuario.perfil == PerfilUsuario.franquia,
            Usuario.ativo == True,
        ))
        if u:
            asyncio.create_task(email_svc.notificar_concluido_cancelamento(numero, vendedor, u.email))
    else:
        nova_area = _area_atual(novo_status)
        if nova_area:
            email_destino = await db.scalar(
                select(Configuracao.valor).where(Configuracao.chave == _AREA_EMAIL_CONFIG[nova_area])
            )
            if email_destino:
                asyncio.create_task(email_svc.notificar_triagem_cancelamento(numero, vendedor, franquia_nome, email_destino))

    return result


@router.put("/{cancelamento_id}/reprovar")
async def reprovar_cancelamento(cancelamento_id: int, payload: ReprovarCancelamentoRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CancelamentoVenda).where(CancelamentoVenda.id == cancelamento_id))
    cancelamento = result.scalar_one_or_none()
    if not cancelamento:
        raise HTTPException(status_code=404, detail="Cancelamento de venda não encontrado")

    if not payload.justificativa or not payload.justificativa.strip():
        raise HTTPException(status_code=422, detail="justificativa é obrigatória")

    area_atual = _area_atual(cancelamento.status)
    if area_atual is None:
        raise HTTPException(status_code=400, detail=f"Não é possível reprovar com status '{cancelamento.status.value}'")

    destino = (payload.destino or "franquia") if area_atual != "comercial" else "franquia"
    if destino != "franquia" and (destino not in _AREA_STATUS or destino == area_atual):
        raise HTTPException(status_code=422, detail="destino inválido")

    _registrar_nota(cancelamento, area_atual, payload.justificativa, "reprovacao")

    cancelamento.status = StatusCancelamentoVenda.aberto if destino == "franquia" else _AREA_STATUS[destino]
    cancelamento.justificativa_reprovacao = payload.justificativa
    cancelamento.destino_reprovacao = destino
    await db.flush()
    await db.refresh(cancelamento)
    result = await _enrich(cancelamento, db)

    numero = cancelamento.numero_pedido_cancelar
    if destino == "franquia":
        u = await db.scalar(select(Usuario).where(
            Usuario.franquia_id == cancelamento.franquia_id,
            Usuario.perfil == PerfilUsuario.franquia,
            Usuario.ativo == True,
        ))
        if u:
            asyncio.create_task(email_svc.notificar_reprovado(numero, payload.justificativa, u.email))
    else:
        email_destino = await db.scalar(
            select(Configuracao.valor).where(Configuracao.chave == _AREA_EMAIL_CONFIG[destino])
        )
        if email_destino:
            asyncio.create_task(email_svc.notificar_reprovado(numero, payload.justificativa, email_destino))

    return result


@router.put("/{cancelamento_id}/reenviar")
async def reenviar_cancelamento(cancelamento_id: int, payload: ReenviarCancelamentoRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CancelamentoVenda).where(CancelamentoVenda.id == cancelamento_id))
    cancelamento = result.scalar_one_or_none()
    if not cancelamento:
        raise HTTPException(status_code=404, detail="Cancelamento de venda não encontrado")

    if cancelamento.status != StatusCancelamentoVenda.aberto:
        raise HTTPException(status_code=400, detail="Só é possível reenviar solicitações com status 'aberto'")

    cancelamento.franquia_id = payload.franquia_id
    cancelamento.motivo = payload.motivo
    cancelamento.vendedor = payload.vendedor
    cancelamento.numero_pedido_cancelar = payload.numero_pedido_cancelar
    cancelamento.data_pedido_cancelar = payload.data_pedido_cancelar
    cancelamento.status_portal = payload.status_portal
    cancelamento.numero_nota_fiscal = payload.numero_nota_fiscal
    cancelamento.data_emissao_nota_fiscal = payload.data_emissao_nota_fiscal
    cancelamento.bike_na_loja = payload.bike_na_loja
    cancelamento.sinais_uso = payload.sinais_uso
    cancelamento.anexos_evidencias_uso = payload.anexos_evidencias_uso
    cancelamento.codigo_produto = payload.codigo_produto
    cancelamento.descricao_modelo = payload.descricao_modelo
    cancelamento.nome_cliente = payload.nome_cliente
    cancelamento.cpf = payload.cpf
    cancelamento.valor_total_pago_cliente = payload.valor_total_pago_cliente
    cancelamento.valor_total_pedido = payload.valor_total_pedido
    cancelamento.valor_cancelar = payload.valor_cancelar
    cancelamento.forma_pagamento = payload.forma_pagamento
    cancelamento.pago_mais_um_cartao = payload.pago_mais_um_cartao
    cancelamento.anexos_portal_comprovante = payload.anexos_portal_comprovante
    cancelamento.justificativa_reprovacao = None
    cancelamento.destino_reprovacao = None
    cancelamento.status = StatusCancelamentoVenda.aguardando_comercial

    await db.flush()
    await db.refresh(cancelamento)
    return await _enrich(cancelamento, db)


@router.delete("/{cancelamento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_cancelamento(cancelamento_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CancelamentoVenda).where(CancelamentoVenda.id == cancelamento_id))
    cancelamento = result.scalar_one_or_none()
    if not cancelamento:
        raise HTTPException(status_code=404, detail="Cancelamento de venda não encontrado")
    if cancelamento.status == StatusCancelamentoVenda.fechado:
        raise HTTPException(status_code=400, detail="Cancelamentos concluídos não podem ser excluídos")
    await db.delete(cancelamento)
    await db.flush()
