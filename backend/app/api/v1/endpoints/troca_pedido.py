import logging
import asyncio
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.core.database import get_db
from app.models.troca_pedido import TrocaPedido, StatusTrocaPedido
from app.models.pessoa import Empresa
from app.models.usuario import Usuario, PerfilUsuario
from app.models.configuracao import Configuracao
from app.schemas.troca_pedido import (
    TrocaPedidoCreate,
    AprovarTrocaRequest,
    ReprovarTrocaRequest,
    ReenviarTrocaRequest,
)
from app.services import email as email_svc

logger = logging.getLogger(__name__)

router = APIRouter()

_DESTINO_STATUS = {
    "faturamento": StatusTrocaPedido.aguardando_faturamento,
    "financeiro": StatusTrocaPedido.aguardando_financeiro,
    "ti": StatusTrocaPedido.aguardando_ti,
}

_DESTINO_EMAIL_CONFIG = {
    "faturamento": "email_faturamento",
    "financeiro": "email_financeiro",
    "ti": "email_ti",
}


def _serialize(t: TrocaPedido, empresa: Empresa | None = None) -> dict:
    return {
        "id": t.id,
        "franquia_id": t.franquia_id,
        "franquia_nome": empresa.nome_fantasia or empresa.razao_social if empresa else "—",
        "motivo": t.motivo,
        "nome_vendedor": t.nome_vendedor,
        "numero_pedido_cancelar": t.numero_pedido_cancelar,
        "data_pedido_cancelar": t.data_pedido_cancelar.isoformat() if t.data_pedido_cancelar else None,
        "codigo_produto_cancelar": t.codigo_produto_cancelar,
        "descricao_pedido_cancelar": t.descricao_pedido_cancelar,
        "numero_novo_pedido": t.numero_novo_pedido,
        "codigo_produto_novo": t.codigo_produto_novo,
        "descricao_novo_pedido": t.descricao_novo_pedido,
        "status_portal": t.status_portal,
        "status": t.status.value if t.status else None,
        "anexos": t.anexos or [],
        "observacao_comercial": t.observacao_comercial,
        "justificativa_reprovacao": t.justificativa_reprovacao,
        "destino_reprovacao": t.destino_reprovacao,
        "criado_em": t.criado_em.isoformat() if t.criado_em else None,
        "atualizado_em": t.atualizado_em.isoformat() if t.atualizado_em else None,
    }


async def _enrich(t: TrocaPedido, db: AsyncSession) -> dict:
    empresa_result = await db.execute(select(Empresa).where(Empresa.id == t.franquia_id))
    empresa = empresa_result.scalar_one_or_none()
    return _serialize(t, empresa)


@router.get("")
async def listar_trocas(
    status_filter: Optional[str] = Query(None, alias="status"),
    franquia_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    query = select(TrocaPedido)
    if status_filter:
        query = query.where(TrocaPedido.status == status_filter)
    if franquia_id:
        query = query.where(TrocaPedido.franquia_id == franquia_id)
    query = query.order_by(TrocaPedido.criado_em.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    trocas = result.scalars().all()

    if trocas:
        franquia_ids = list({t.franquia_id for t in trocas})
        emp_result = await db.execute(select(Empresa).where(Empresa.id.in_(franquia_ids)))
        empresas_map = {e.id: e for e in emp_result.scalars().all()}
    else:
        empresas_map = {}

    return [_serialize(t, empresas_map.get(t.franquia_id)) for t in trocas]


@router.get("/{troca_id}")
async def obter_troca(troca_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TrocaPedido).where(TrocaPedido.id == troca_id))
    troca = result.scalar_one_or_none()
    if not troca:
        raise HTTPException(status_code=404, detail="Troca de pedido não encontrada")
    return await _enrich(troca, db)


@router.post("", status_code=status.HTTP_201_CREATED)
async def criar_troca(payload: TrocaPedidoCreate, db: AsyncSession = Depends(get_db)):
    emp = await db.scalar(select(Empresa).where(Empresa.id == payload.franquia_id))
    if not emp:
        raise HTTPException(status_code=422, detail=f"Franquia {payload.franquia_id} não encontrada")

    troca = TrocaPedido(
        franquia_id=payload.franquia_id,
        motivo=payload.motivo,
        nome_vendedor=payload.nome_vendedor,
        numero_pedido_cancelar=payload.numero_pedido_cancelar,
        data_pedido_cancelar=payload.data_pedido_cancelar,
        codigo_produto_cancelar=payload.codigo_produto_cancelar,
        descricao_pedido_cancelar=payload.descricao_pedido_cancelar,
        numero_novo_pedido=payload.numero_novo_pedido,
        codigo_produto_novo=payload.codigo_produto_novo,
        descricao_novo_pedido=payload.descricao_novo_pedido,
        status_portal=payload.status_portal,
        status=StatusTrocaPedido.aguardando_comercial,
        anexos=payload.anexos,
    )
    db.add(troca)
    await db.flush()
    await db.refresh(troca)
    result = await _enrich(troca, db)

    asyncio.create_task(email_svc.notificar_novo_pedido_troca(
        payload.numero_pedido_cancelar, payload.nome_vendedor, result.get("franquia_nome", "")
    ))
    return result


@router.put("/{troca_id}/aprovar")
async def aprovar_troca(troca_id: int, payload: AprovarTrocaRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TrocaPedido).where(TrocaPedido.id == troca_id))
    troca = result.scalar_one_or_none()
    if not troca:
        raise HTTPException(status_code=404, detail="Troca de pedido não encontrada")

    if troca.status == StatusTrocaPedido.aguardando_comercial:
        if payload.destino not in _DESTINO_STATUS:
            raise HTTPException(status_code=422, detail="destino deve ser faturamento, financeiro ou ti")
        troca.status = _DESTINO_STATUS[payload.destino]
        troca.observacao_comercial = payload.observacao

    elif troca.status in (
        StatusTrocaPedido.aguardando_faturamento,
        StatusTrocaPedido.aguardando_financeiro,
        StatusTrocaPedido.aguardando_ti,
    ):
        if payload.anexos:
            troca.anexos = (troca.anexos or []) + payload.anexos
        troca.status = StatusTrocaPedido.fechado

    else:
        raise HTTPException(status_code=400, detail=f"Não é possível aprovar com status '{troca.status.value}'")

    troca.justificativa_reprovacao = None
    troca.destino_reprovacao = None
    await db.flush()
    await db.refresh(troca)
    result = await _enrich(troca, db)

    franquia_nome = result.get("franquia_nome", "")
    numero = troca.numero_pedido_cancelar
    vendedor = troca.nome_vendedor
    if troca.status in _DESTINO_STATUS.values():
        destino = next(d for d, s in _DESTINO_STATUS.items() if s == troca.status)
        email_destino = await db.scalar(
            select(Configuracao.valor).where(Configuracao.chave == _DESTINO_EMAIL_CONFIG[destino])
        )
        if email_destino:
            asyncio.create_task(email_svc.notificar_triagem_troca(numero, vendedor, franquia_nome, email_destino))
    elif troca.status == StatusTrocaPedido.fechado:
        u = await db.scalar(select(Usuario).where(
            Usuario.franquia_id == troca.franquia_id,
            Usuario.perfil == PerfilUsuario.franquia,
            Usuario.ativo == True,
        ))
        if u:
            asyncio.create_task(email_svc.notificar_concluido_troca(numero, vendedor, u.email))

    return result


@router.put("/{troca_id}/reprovar")
async def reprovar_troca(troca_id: int, payload: ReprovarTrocaRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TrocaPedido).where(TrocaPedido.id == troca_id))
    troca = result.scalar_one_or_none()
    if not troca:
        raise HTTPException(status_code=404, detail="Troca de pedido não encontrada")

    if troca.status not in (
        StatusTrocaPedido.aguardando_comercial,
        StatusTrocaPedido.aguardando_faturamento,
        StatusTrocaPedido.aguardando_financeiro,
        StatusTrocaPedido.aguardando_ti,
    ):
        raise HTTPException(status_code=400, detail=f"Não é possível reprovar com status '{troca.status.value}'")

    troca.status = StatusTrocaPedido.aberto
    troca.justificativa_reprovacao = payload.justificativa
    troca.destino_reprovacao = "franquia"
    await db.flush()
    await db.refresh(troca)
    result = await _enrich(troca, db)

    u = await db.scalar(select(Usuario).where(
        Usuario.franquia_id == troca.franquia_id,
        Usuario.perfil == PerfilUsuario.franquia,
        Usuario.ativo == True,
    ))
    if u:
        asyncio.create_task(email_svc.notificar_reprovado(
            troca.numero_pedido_cancelar, payload.justificativa, u.email
        ))

    return result


@router.put("/{troca_id}/reenviar")
async def reenviar_troca(troca_id: int, payload: ReenviarTrocaRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TrocaPedido).where(TrocaPedido.id == troca_id))
    troca = result.scalar_one_or_none()
    if not troca:
        raise HTTPException(status_code=404, detail="Troca de pedido não encontrada")

    if troca.status != StatusTrocaPedido.aberto:
        raise HTTPException(status_code=400, detail="Só é possível reenviar solicitações com status 'aberto'")

    troca.franquia_id = payload.franquia_id
    troca.motivo = payload.motivo
    troca.nome_vendedor = payload.nome_vendedor
    troca.numero_pedido_cancelar = payload.numero_pedido_cancelar
    troca.data_pedido_cancelar = payload.data_pedido_cancelar
    troca.codigo_produto_cancelar = payload.codigo_produto_cancelar
    troca.descricao_pedido_cancelar = payload.descricao_pedido_cancelar
    troca.numero_novo_pedido = payload.numero_novo_pedido
    troca.codigo_produto_novo = payload.codigo_produto_novo
    troca.descricao_novo_pedido = payload.descricao_novo_pedido
    troca.status_portal = payload.status_portal
    troca.anexos = payload.anexos
    troca.justificativa_reprovacao = None
    troca.destino_reprovacao = None
    troca.status = StatusTrocaPedido.aguardando_comercial

    await db.flush()
    await db.refresh(troca)
    return await _enrich(troca, db)


@router.delete("/{troca_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_troca(troca_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TrocaPedido).where(TrocaPedido.id == troca_id))
    troca = result.scalar_one_or_none()
    if not troca:
        raise HTTPException(status_code=404, detail="Troca de pedido não encontrada")
    if troca.status == StatusTrocaPedido.fechado:
        raise HTTPException(status_code=400, detail="Trocas concluídas não podem ser excluídas")
    await db.delete(troca)
    await db.flush()
