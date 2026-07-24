import logging
import asyncio
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.core.database import get_db
from app.models.link_pagamento import LinkPagamento, StatusLinkPagamento
from app.models.pessoa import Empresa
from app.models.usuario import Usuario, PerfilUsuario
from app.models.configuracao import Configuracao
from app.schemas.link_pagamento import (
    LinkPagamentoCreate,
    AprovarLinkRequest,
    ReprovarLinkRequest,
    ReenviarLinkRequest,
)
from app.services import email as email_svc

logger = logging.getLogger(__name__)

router = APIRouter()

_DESTINO_STATUS = {
    "faturamento": StatusLinkPagamento.aguardando_faturamento,
    "financeiro": StatusLinkPagamento.aguardando_financeiro,
    "ti": StatusLinkPagamento.aguardando_ti,
}

_DESTINO_EMAIL_CONFIG = {
    "faturamento": "email_faturamento",
    "financeiro": "email_financeiro",
    "ti": "email_ti",
}


def _serialize(l: LinkPagamento, empresa: Empresa | None = None) -> dict:
    return {
        "id": l.id,
        "franquia_id": l.franquia_id,
        "franquia_nome": empresa.nome_fantasia or empresa.razao_social if empresa else "—",
        "motivo": l.motivo,
        "numero_pedido": l.numero_pedido,
        "data_pedido": l.data_pedido.isoformat() if l.data_pedido else None,
        "valor_pedido": l.valor_pedido,
        "valor_link": l.valor_link,
        "quantidade_parcelas": l.quantidade_parcelas,
        "codigo_produto": l.codigo_produto,
        "modelo": l.modelo,
        "vendedor": l.vendedor,
        "nome_cliente": l.nome_cliente,
        "cpf": l.cpf,
        "email": l.email,
        "endereco": l.endereco,
        "telefone": l.telefone,
        "status": l.status.value if l.status else None,
        "anexos": l.anexos or [],
        "observacao_comercial": l.observacao_comercial,
        "justificativa_reprovacao": l.justificativa_reprovacao,
        "destino_reprovacao": l.destino_reprovacao,
        "criado_em": l.criado_em.isoformat() if l.criado_em else None,
        "atualizado_em": l.atualizado_em.isoformat() if l.atualizado_em else None,
    }


async def _enrich(l: LinkPagamento, db: AsyncSession) -> dict:
    empresa_result = await db.execute(select(Empresa).where(Empresa.id == l.franquia_id))
    empresa = empresa_result.scalar_one_or_none()
    return _serialize(l, empresa)


@router.get("")
async def listar_links(
    status_filter: Optional[str] = Query(None, alias="status"),
    franquia_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    query = select(LinkPagamento)
    if status_filter:
        query = query.where(LinkPagamento.status == status_filter)
    if franquia_id:
        query = query.where(LinkPagamento.franquia_id == franquia_id)
    query = query.order_by(LinkPagamento.criado_em.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    links = result.scalars().all()

    if links:
        franquia_ids = list({l.franquia_id for l in links})
        emp_result = await db.execute(select(Empresa).where(Empresa.id.in_(franquia_ids)))
        empresas_map = {e.id: e for e in emp_result.scalars().all()}
    else:
        empresas_map = {}

    return [_serialize(l, empresas_map.get(l.franquia_id)) for l in links]


@router.get("/{link_id}")
async def obter_link(link_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LinkPagamento).where(LinkPagamento.id == link_id))
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Link de pagamento não encontrado")
    return await _enrich(link, db)


@router.post("", status_code=status.HTTP_201_CREATED)
async def criar_link(payload: LinkPagamentoCreate, db: AsyncSession = Depends(get_db)):
    emp = await db.scalar(select(Empresa).where(Empresa.id == payload.franquia_id))
    if not emp:
        raise HTTPException(status_code=422, detail=f"Franquia {payload.franquia_id} não encontrada")

    link = LinkPagamento(
        franquia_id=payload.franquia_id,
        motivo=payload.motivo,
        numero_pedido=payload.numero_pedido,
        data_pedido=payload.data_pedido,
        valor_pedido=payload.valor_pedido,
        valor_link=payload.valor_link,
        quantidade_parcelas=payload.quantidade_parcelas,
        codigo_produto=payload.codigo_produto,
        modelo=payload.modelo,
        vendedor=payload.vendedor,
        nome_cliente=payload.nome_cliente,
        cpf=payload.cpf,
        email=payload.email,
        endereco=payload.endereco,
        telefone=payload.telefone,
        status=StatusLinkPagamento.aguardando_comercial,
        anexos=payload.anexos,
    )
    db.add(link)
    await db.flush()
    await db.refresh(link)
    result = await _enrich(link, db)

    asyncio.create_task(email_svc.notificar_novo_pedido_link(
        payload.numero_pedido, payload.vendedor, result.get("franquia_nome", "")
    ))
    return result


@router.put("/{link_id}/aprovar")
async def aprovar_link(link_id: int, payload: AprovarLinkRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LinkPagamento).where(LinkPagamento.id == link_id))
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Link de pagamento não encontrado")

    if link.status == StatusLinkPagamento.aguardando_comercial:
        if payload.destino not in _DESTINO_STATUS:
            raise HTTPException(status_code=422, detail="destino deve ser faturamento, financeiro ou ti")
        link.status = _DESTINO_STATUS[payload.destino]
        link.observacao_comercial = payload.observacao

    elif link.status in (
        StatusLinkPagamento.aguardando_faturamento,
        StatusLinkPagamento.aguardando_financeiro,
        StatusLinkPagamento.aguardando_ti,
    ):
        if payload.anexos:
            link.anexos = (link.anexos or []) + payload.anexos
        link.status = StatusLinkPagamento.fechado

    else:
        raise HTTPException(status_code=400, detail=f"Não é possível aprovar com status '{link.status.value}'")

    link.justificativa_reprovacao = None
    link.destino_reprovacao = None
    await db.flush()
    await db.refresh(link)
    result = await _enrich(link, db)

    franquia_nome = result.get("franquia_nome", "")
    numero = link.numero_pedido
    vendedor = link.vendedor
    if link.status in _DESTINO_STATUS.values():
        destino = next(d for d, s in _DESTINO_STATUS.items() if s == link.status)
        email_destino = await db.scalar(
            select(Configuracao.valor).where(Configuracao.chave == _DESTINO_EMAIL_CONFIG[destino])
        )
        if email_destino:
            asyncio.create_task(email_svc.notificar_triagem_link(numero, vendedor, franquia_nome, email_destino))
    elif link.status == StatusLinkPagamento.fechado:
        u = await db.scalar(select(Usuario).where(
            Usuario.franquia_id == link.franquia_id,
            Usuario.perfil == PerfilUsuario.franquia,
            Usuario.ativo == True,
        ))
        if u:
            asyncio.create_task(email_svc.notificar_concluido_link(numero, vendedor, u.email))

    return result


@router.put("/{link_id}/reprovar")
async def reprovar_link(link_id: int, payload: ReprovarLinkRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LinkPagamento).where(LinkPagamento.id == link_id))
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Link de pagamento não encontrado")

    if link.status not in (
        StatusLinkPagamento.aguardando_comercial,
        StatusLinkPagamento.aguardando_faturamento,
        StatusLinkPagamento.aguardando_financeiro,
        StatusLinkPagamento.aguardando_ti,
    ):
        raise HTTPException(status_code=400, detail=f"Não é possível reprovar com status '{link.status.value}'")

    link.status = StatusLinkPagamento.aberto
    link.justificativa_reprovacao = payload.justificativa
    link.destino_reprovacao = "franquia"
    await db.flush()
    await db.refresh(link)
    result = await _enrich(link, db)

    u = await db.scalar(select(Usuario).where(
        Usuario.franquia_id == link.franquia_id,
        Usuario.perfil == PerfilUsuario.franquia,
        Usuario.ativo == True,
    ))
    if u:
        asyncio.create_task(email_svc.notificar_reprovado(
            link.numero_pedido, payload.justificativa, u.email
        ))

    return result


@router.put("/{link_id}/reenviar")
async def reenviar_link(link_id: int, payload: ReenviarLinkRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LinkPagamento).where(LinkPagamento.id == link_id))
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Link de pagamento não encontrado")

    if link.status != StatusLinkPagamento.aberto:
        raise HTTPException(status_code=400, detail="Só é possível reenviar solicitações com status 'aberto'")

    link.franquia_id = payload.franquia_id
    link.motivo = payload.motivo
    link.numero_pedido = payload.numero_pedido
    link.data_pedido = payload.data_pedido
    link.valor_pedido = payload.valor_pedido
    link.valor_link = payload.valor_link
    link.quantidade_parcelas = payload.quantidade_parcelas
    link.codigo_produto = payload.codigo_produto
    link.modelo = payload.modelo
    link.vendedor = payload.vendedor
    link.nome_cliente = payload.nome_cliente
    link.cpf = payload.cpf
    link.email = payload.email
    link.endereco = payload.endereco
    link.telefone = payload.telefone
    link.anexos = payload.anexos
    link.justificativa_reprovacao = None
    link.destino_reprovacao = None
    link.status = StatusLinkPagamento.aguardando_comercial

    await db.flush()
    await db.refresh(link)
    return await _enrich(link, db)


@router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_link(link_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LinkPagamento).where(LinkPagamento.id == link_id))
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Link de pagamento não encontrado")
    if link.status == StatusLinkPagamento.fechado:
        raise HTTPException(status_code=400, detail="Links concluídos não podem ser excluídos")
    await db.delete(link)
    await db.flush()
