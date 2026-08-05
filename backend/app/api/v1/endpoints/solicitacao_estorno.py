import logging
import asyncio
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.core.database import get_db
from app.models.solicitacao_estorno import SolicitacaoEstorno, StatusSolicitacaoEstorno
from app.models.pessoa import Empresa
from app.models.usuario import Usuario, PerfilUsuario
from app.models.configuracao import Configuracao
from app.schemas.solicitacao_estorno import (
    SolicitacaoEstornoCreate,
    AprovarEstornoRequest,
    ReprovarEstornoRequest,
    ReenviarEstornoRequest,
)
from app.services import email as email_svc

logger = logging.getLogger(__name__)

router = APIRouter()


def _serialize(s: SolicitacaoEstorno, empresa: Empresa | None = None) -> dict:
    return {
        "id": s.id,
        "franquia_id": s.franquia_id,
        "franquia_nome": empresa.nome_fantasia or empresa.razao_social if empresa else "—",
        "motivo": s.motivo,
        "vendedor": s.vendedor,
        "numero_pedido": s.numero_pedido,
        "data_pedido": s.data_pedido.isoformat() if s.data_pedido else None,
        "nome_cliente": s.nome_cliente,
        "cpf": s.cpf,
        "data_pagamento": s.data_pagamento.isoformat() if s.data_pagamento else None,
        "valor_pedido_portal": s.valor_pedido_portal,
        "valor_total_pago": s.valor_total_pago,
        "valor_devolver": s.valor_devolver,
        "status": s.status.value if s.status else None,
        "anexos": s.anexos or [],
        "observacao_comercial": s.observacao_comercial,
        "justificativa_reprovacao": s.justificativa_reprovacao,
        "destino_reprovacao": s.destino_reprovacao,
        "criado_em": s.criado_em.isoformat() if s.criado_em else None,
        "atualizado_em": s.atualizado_em.isoformat() if s.atualizado_em else None,
    }


async def _enrich(s: SolicitacaoEstorno, db: AsyncSession) -> dict:
    empresa_result = await db.execute(select(Empresa).where(Empresa.id == s.franquia_id))
    empresa = empresa_result.scalar_one_or_none()
    return _serialize(s, empresa)


@router.get("")
async def listar_estornos(
    status_filter: Optional[str] = Query(None, alias="status"),
    franquia_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    query = select(SolicitacaoEstorno)
    if status_filter:
        query = query.where(SolicitacaoEstorno.status == status_filter)
    if franquia_id:
        query = query.where(SolicitacaoEstorno.franquia_id == franquia_id)
    query = query.order_by(SolicitacaoEstorno.criado_em.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    estornos = result.scalars().all()

    if estornos:
        franquia_ids = list({s.franquia_id for s in estornos})
        emp_result = await db.execute(select(Empresa).where(Empresa.id.in_(franquia_ids)))
        empresas_map = {e.id: e for e in emp_result.scalars().all()}
    else:
        empresas_map = {}

    return [_serialize(s, empresas_map.get(s.franquia_id)) for s in estornos]


@router.get("/{estorno_id}")
async def obter_estorno(estorno_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SolicitacaoEstorno).where(SolicitacaoEstorno.id == estorno_id))
    estorno = result.scalar_one_or_none()
    if not estorno:
        raise HTTPException(status_code=404, detail="Solicitação de estorno não encontrada")
    return await _enrich(estorno, db)


@router.post("", status_code=status.HTTP_201_CREATED)
async def criar_estorno(payload: SolicitacaoEstornoCreate, db: AsyncSession = Depends(get_db)):
    emp = await db.scalar(select(Empresa).where(Empresa.id == payload.franquia_id))
    if not emp:
        raise HTTPException(status_code=422, detail=f"Franquia {payload.franquia_id} não encontrada")

    estorno = SolicitacaoEstorno(
        franquia_id=payload.franquia_id,
        motivo=payload.motivo,
        vendedor=payload.vendedor,
        numero_pedido=payload.numero_pedido,
        data_pedido=payload.data_pedido,
        nome_cliente=payload.nome_cliente,
        cpf=payload.cpf,
        data_pagamento=payload.data_pagamento,
        valor_pedido_portal=payload.valor_pedido_portal,
        valor_total_pago=payload.valor_total_pago,
        valor_devolver=payload.valor_devolver,
        status=StatusSolicitacaoEstorno.aguardando_comercial,
        anexos=payload.anexos,
    )
    db.add(estorno)
    await db.flush()
    await db.refresh(estorno)
    result = await _enrich(estorno, db)

    asyncio.create_task(email_svc.notificar_novo_pedido_estorno(
        payload.numero_pedido or "Sinal/Garantia (sem pedido)", payload.vendedor, result.get("franquia_nome", "")
    ))
    return result


@router.put("/{estorno_id}/aprovar")
async def aprovar_estorno(estorno_id: int, payload: AprovarEstornoRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SolicitacaoEstorno).where(SolicitacaoEstorno.id == estorno_id))
    estorno = result.scalar_one_or_none()
    if not estorno:
        raise HTTPException(status_code=404, detail="Solicitação de estorno não encontrada")

    if estorno.status == StatusSolicitacaoEstorno.aguardando_comercial:
        estorno.status = StatusSolicitacaoEstorno.aguardando_financeiro
        estorno.observacao_comercial = payload.observacao

    elif estorno.status == StatusSolicitacaoEstorno.aguardando_financeiro:
        if payload.anexos:
            estorno.anexos = (estorno.anexos or []) + payload.anexos
        estorno.status = StatusSolicitacaoEstorno.fechado

    else:
        raise HTTPException(status_code=400, detail=f"Não é possível aprovar com status '{estorno.status.value}'")

    estorno.justificativa_reprovacao = None
    estorno.destino_reprovacao = None
    await db.flush()
    await db.refresh(estorno)
    result = await _enrich(estorno, db)

    franquia_nome = result.get("franquia_nome", "")
    numero = estorno.numero_pedido or "Sinal/Garantia (sem pedido)"
    vendedor = estorno.vendedor
    if estorno.status == StatusSolicitacaoEstorno.aguardando_financeiro:
        email_financeiro = await db.scalar(
            select(Configuracao.valor).where(Configuracao.chave == "email_financeiro")
        )
        if email_financeiro:
            asyncio.create_task(email_svc.notificar_triagem_estorno(numero, vendedor, franquia_nome, email_financeiro))
    elif estorno.status == StatusSolicitacaoEstorno.fechado:
        u = await db.scalar(select(Usuario).where(
            Usuario.franquia_id == estorno.franquia_id,
            Usuario.perfil == PerfilUsuario.franquia,
            Usuario.ativo == True,
        ))
        if u:
            asyncio.create_task(email_svc.notificar_concluido_estorno(numero, vendedor, u.email))

    return result


@router.put("/{estorno_id}/reprovar")
async def reprovar_estorno(estorno_id: int, payload: ReprovarEstornoRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SolicitacaoEstorno).where(SolicitacaoEstorno.id == estorno_id))
    estorno = result.scalar_one_or_none()
    if not estorno:
        raise HTTPException(status_code=404, detail="Solicitação de estorno não encontrada")

    if not payload.justificativa or not payload.justificativa.strip():
        raise HTTPException(status_code=422, detail="justificativa é obrigatória")

    if estorno.status == StatusSolicitacaoEstorno.aguardando_comercial:
        destino = "franquia"
        estorno.status = StatusSolicitacaoEstorno.aberto

    elif estorno.status == StatusSolicitacaoEstorno.aguardando_financeiro:
        destino = payload.destino or "franquia"
        if destino not in ("comercial", "franquia"):
            raise HTTPException(status_code=422, detail="destino deve ser comercial ou franquia")
        estorno.status = StatusSolicitacaoEstorno.aguardando_comercial if destino == "comercial" else StatusSolicitacaoEstorno.aberto

    else:
        raise HTTPException(status_code=400, detail=f"Não é possível reprovar com status '{estorno.status.value}'")

    estorno.justificativa_reprovacao = payload.justificativa
    estorno.destino_reprovacao = destino
    await db.flush()
    await db.refresh(estorno)
    result = await _enrich(estorno, db)

    numero = estorno.numero_pedido or "Sinal/Garantia (sem pedido)"
    if destino == "franquia":
        u = await db.scalar(select(Usuario).where(
            Usuario.franquia_id == estorno.franquia_id,
            Usuario.perfil == PerfilUsuario.franquia,
            Usuario.ativo == True,
        ))
        if u:
            asyncio.create_task(email_svc.notificar_reprovado(numero, payload.justificativa, u.email))
    else:
        email_comercial = await db.scalar(
            select(Configuracao.valor).where(Configuracao.chave == "email_comercial")
        )
        if email_comercial:
            asyncio.create_task(email_svc.notificar_reprovado(numero, payload.justificativa, email_comercial))

    return result


@router.put("/{estorno_id}/reenviar")
async def reenviar_estorno(estorno_id: int, payload: ReenviarEstornoRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SolicitacaoEstorno).where(SolicitacaoEstorno.id == estorno_id))
    estorno = result.scalar_one_or_none()
    if not estorno:
        raise HTTPException(status_code=404, detail="Solicitação de estorno não encontrada")

    if estorno.status != StatusSolicitacaoEstorno.aberto:
        raise HTTPException(status_code=400, detail="Só é possível reenviar solicitações com status 'aberto'")

    estorno.franquia_id = payload.franquia_id
    estorno.motivo = payload.motivo
    estorno.vendedor = payload.vendedor
    estorno.numero_pedido = payload.numero_pedido
    estorno.data_pedido = payload.data_pedido
    estorno.nome_cliente = payload.nome_cliente
    estorno.cpf = payload.cpf
    estorno.data_pagamento = payload.data_pagamento
    estorno.valor_pedido_portal = payload.valor_pedido_portal
    estorno.valor_total_pago = payload.valor_total_pago
    estorno.valor_devolver = payload.valor_devolver
    estorno.anexos = payload.anexos
    estorno.justificativa_reprovacao = None
    estorno.destino_reprovacao = None
    estorno.status = StatusSolicitacaoEstorno.aguardando_comercial

    await db.flush()
    await db.refresh(estorno)
    return await _enrich(estorno, db)


@router.delete("/{estorno_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_estorno(estorno_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SolicitacaoEstorno).where(SolicitacaoEstorno.id == estorno_id))
    estorno = result.scalar_one_or_none()
    if not estorno:
        raise HTTPException(status_code=404, detail="Solicitação de estorno não encontrada")
    if estorno.status == StatusSolicitacaoEstorno.fechado:
        raise HTTPException(status_code=400, detail="Estornos concluídos não podem ser excluídos")
    await db.delete(estorno)
    await db.flush()
