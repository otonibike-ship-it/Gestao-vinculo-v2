import logging
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.core.database import get_db
from app.models.carta_correcao import CartaCorrecao, StatusCartaCorrecao
from app.models.pessoa import Empresa
from app.models.usuario import Usuario, PerfilUsuario
from app.models.configuracao import Configuracao
from app.schemas.carta_correcao import (
    CartaCorrecaoCreate,
    AprovarCartaRequest,
    ReprovarCartaRequest,
    ReenviarCartaRequest,
)
from app.services import email as email_svc

logger = logging.getLogger(__name__)

router = APIRouter()

_AREA_STATUS = {
    "comercial": StatusCartaCorrecao.aguardando_comercial,
    "financeiro": StatusCartaCorrecao.aguardando_financeiro,
}
_AREA_EMAIL_CONFIG = {
    "comercial": "email_comercial",
    "financeiro": "email_financeiro",
}


def _area_atual(carta_status: StatusCartaCorrecao) -> Optional[str]:
    for area, s in _AREA_STATUS.items():
        if s == carta_status:
            return area
    return None


def _registrar_nota(carta: CartaCorrecao, area: str, texto: Optional[str], tipo: str):
    if not texto or not texto.strip():
        return
    historico = list(carta.historico_observacoes or [])
    historico.append({
        "area": area,
        "texto": texto.strip(),
        "tipo": tipo,
        "data": datetime.now(timezone.utc).isoformat(),
    })
    carta.historico_observacoes = historico


def _serialize(c: CartaCorrecao, empresa: Empresa | None = None) -> dict:
    return {
        "id": c.id,
        "franquia_id": c.franquia_id,
        "franquia_nome": empresa.nome_fantasia or empresa.razao_social if empresa else "—",
        "numero_nota_fiscal": c.numero_nota_fiscal,
        "numero_pedido": c.numero_pedido,
        "nome_cliente_pedido": c.nome_cliente_pedido,
        "campo_correcao": c.campo_correcao,
        "motivo_divergencia": c.motivo_divergencia,
        "info_numero_serie_ticket": c.info_numero_serie_ticket,
        "nome_correto_cliente": c.nome_correto_cliente,
        "sobrenome_correto_cliente": c.sobrenome_correto_cliente,
        "complemento_dados_adicionais": c.complemento_dados_adicionais,
        "status": c.status.value if c.status else None,
        "anexos": c.anexos or [],
        "observacao_comercial": c.observacao_comercial,
        "justificativa_reprovacao": c.justificativa_reprovacao,
        "destino_reprovacao": c.destino_reprovacao,
        "historico_observacoes": c.historico_observacoes or [],
        "criado_em": c.criado_em.isoformat() if c.criado_em else None,
        "atualizado_em": c.atualizado_em.isoformat() if c.atualizado_em else None,
    }


async def _enrich(c: CartaCorrecao, db: AsyncSession) -> dict:
    empresa_result = await db.execute(select(Empresa).where(Empresa.id == c.franquia_id))
    empresa = empresa_result.scalar_one_or_none()
    return _serialize(c, empresa)


@router.get("")
async def listar_cartas(
    status_filter: Optional[str] = Query(None, alias="status"),
    franquia_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    query = select(CartaCorrecao)
    if status_filter:
        query = query.where(CartaCorrecao.status == status_filter)
    if franquia_id:
        query = query.where(CartaCorrecao.franquia_id == franquia_id)
    query = query.order_by(CartaCorrecao.criado_em.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    cartas = result.scalars().all()

    if cartas:
        franquia_ids = list({c.franquia_id for c in cartas})
        emp_result = await db.execute(select(Empresa).where(Empresa.id.in_(franquia_ids)))
        empresas_map = {e.id: e for e in emp_result.scalars().all()}
    else:
        empresas_map = {}

    return [_serialize(c, empresas_map.get(c.franquia_id)) for c in cartas]


@router.get("/{carta_id}")
async def obter_carta(carta_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CartaCorrecao).where(CartaCorrecao.id == carta_id))
    carta = result.scalar_one_or_none()
    if not carta:
        raise HTTPException(status_code=404, detail="Carta de correção não encontrada")
    return await _enrich(carta, db)


@router.post("", status_code=status.HTTP_201_CREATED)
async def criar_carta(payload: CartaCorrecaoCreate, db: AsyncSession = Depends(get_db)):
    emp = await db.scalar(select(Empresa).where(Empresa.id == payload.franquia_id))
    if not emp:
        raise HTTPException(status_code=422, detail=f"Franquia {payload.franquia_id} não encontrada")

    carta = CartaCorrecao(
        franquia_id=payload.franquia_id,
        numero_nota_fiscal=payload.numero_nota_fiscal,
        numero_pedido=payload.numero_pedido,
        nome_cliente_pedido=payload.nome_cliente_pedido,
        campo_correcao=payload.campo_correcao,
        motivo_divergencia=payload.motivo_divergencia,
        info_numero_serie_ticket=payload.info_numero_serie_ticket,
        nome_correto_cliente=payload.nome_correto_cliente,
        sobrenome_correto_cliente=payload.sobrenome_correto_cliente,
        complemento_dados_adicionais=payload.complemento_dados_adicionais,
        status=StatusCartaCorrecao.aguardando_comercial,
        anexos=payload.anexos,
    )
    db.add(carta)
    await db.flush()
    await db.refresh(carta)
    result = await _enrich(carta, db)

    asyncio.create_task(email_svc.notificar_novo_pedido_carta(
        payload.numero_pedido, payload.nome_cliente_pedido, result.get("franquia_nome", "")
    ))
    return result


@router.put("/{carta_id}/aprovar")
async def aprovar_carta(carta_id: int, payload: AprovarCartaRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CartaCorrecao).where(CartaCorrecao.id == carta_id))
    carta = result.scalar_one_or_none()
    if not carta:
        raise HTTPException(status_code=404, detail="Carta de correção não encontrada")

    area_atual = _area_atual(carta.status)
    if area_atual:
        _registrar_nota(carta, area_atual, payload.observacao, "aprovacao")

    if carta.status == StatusCartaCorrecao.aguardando_comercial:
        carta.status = StatusCartaCorrecao.aguardando_financeiro
        carta.observacao_comercial = payload.observacao

    elif carta.status == StatusCartaCorrecao.aguardando_financeiro:
        if payload.anexos:
            carta.anexos = (carta.anexos or []) + payload.anexos
        carta.status = StatusCartaCorrecao.fechado

    else:
        raise HTTPException(status_code=400, detail=f"Não é possível aprovar com status '{carta.status.value}'")

    carta.justificativa_reprovacao = None
    carta.destino_reprovacao = None
    await db.flush()
    await db.refresh(carta)
    result = await _enrich(carta, db)

    franquia_nome = result.get("franquia_nome", "")
    numero = carta.numero_pedido
    cliente = carta.nome_cliente_pedido
    if carta.status == StatusCartaCorrecao.aguardando_financeiro:
        email_financeiro = await db.scalar(
            select(Configuracao.valor).where(Configuracao.chave == "email_financeiro")
        )
        if email_financeiro:
            asyncio.create_task(email_svc.notificar_triagem_carta(numero, cliente, franquia_nome, email_financeiro))
    elif carta.status == StatusCartaCorrecao.fechado:
        u = await db.scalar(select(Usuario).where(
            Usuario.franquia_id == carta.franquia_id,
            Usuario.perfil == PerfilUsuario.franquia,
            Usuario.ativo == True,
        ))
        if u:
            asyncio.create_task(email_svc.notificar_concluido_carta(numero, cliente, u.email))

    return result


@router.put("/{carta_id}/reprovar")
async def reprovar_carta(carta_id: int, payload: ReprovarCartaRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CartaCorrecao).where(CartaCorrecao.id == carta_id))
    carta = result.scalar_one_or_none()
    if not carta:
        raise HTTPException(status_code=404, detail="Carta de correção não encontrada")

    area_atual = _area_atual(carta.status)
    if area_atual is None:
        raise HTTPException(status_code=400, detail=f"Não é possível reprovar com status '{carta.status.value}'")

    destino = (payload.destino or "franquia") if area_atual != "comercial" else "franquia"
    if destino != "franquia" and (destino not in _AREA_STATUS or destino == area_atual):
        raise HTTPException(status_code=422, detail="destino inválido")

    _registrar_nota(carta, area_atual, payload.justificativa, "reprovacao")

    carta.status = StatusCartaCorrecao.aberto if destino == "franquia" else _AREA_STATUS[destino]
    carta.justificativa_reprovacao = payload.justificativa
    carta.destino_reprovacao = destino
    await db.flush()
    await db.refresh(carta)
    result = await _enrich(carta, db)

    numero = carta.numero_pedido
    if destino == "franquia":
        u = await db.scalar(select(Usuario).where(
            Usuario.franquia_id == carta.franquia_id,
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


@router.put("/{carta_id}/reenviar")
async def reenviar_carta(carta_id: int, payload: ReenviarCartaRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CartaCorrecao).where(CartaCorrecao.id == carta_id))
    carta = result.scalar_one_or_none()
    if not carta:
        raise HTTPException(status_code=404, detail="Carta de correção não encontrada")

    if carta.status != StatusCartaCorrecao.aberto:
        raise HTTPException(status_code=400, detail="Só é possível reenviar solicitações com status 'aberto'")

    carta.franquia_id = payload.franquia_id
    carta.numero_nota_fiscal = payload.numero_nota_fiscal
    carta.numero_pedido = payload.numero_pedido
    carta.nome_cliente_pedido = payload.nome_cliente_pedido
    carta.campo_correcao = payload.campo_correcao
    carta.motivo_divergencia = payload.motivo_divergencia
    carta.info_numero_serie_ticket = payload.info_numero_serie_ticket
    carta.nome_correto_cliente = payload.nome_correto_cliente
    carta.sobrenome_correto_cliente = payload.sobrenome_correto_cliente
    carta.complemento_dados_adicionais = payload.complemento_dados_adicionais
    carta.anexos = payload.anexos
    carta.justificativa_reprovacao = None
    carta.destino_reprovacao = None
    carta.status = StatusCartaCorrecao.aguardando_comercial

    await db.flush()
    await db.refresh(carta)
    return await _enrich(carta, db)


@router.delete("/{carta_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_carta(carta_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CartaCorrecao).where(CartaCorrecao.id == carta_id))
    carta = result.scalar_one_or_none()
    if not carta:
        raise HTTPException(status_code=404, detail="Carta de correção não encontrada")
    if carta.status == StatusCartaCorrecao.fechado:
        raise HTTPException(status_code=400, detail="Cartas concluídas não podem ser excluídas")
    await db.delete(carta)
    await db.flush()
