import logging
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from typing import Optional
from app.core.database import get_db
from app.models.vinculo import Vinculo, StatusVinculo
from app.models.pessoa import Empresa
from app.models.usuario import Usuario, PerfilUsuario
from app.models.configuracao import Configuracao
from app.schemas.vinculo import VinculoCreate, VinculoResponse, AprovarRequest, ReprovarRequest, ReenviarRequest
from app.services import email as email_svc

logger = logging.getLogger(__name__)

router = APIRouter()

_AREA_STATUS = {
    "comercial": StatusVinculo.validacao_comercial,
    "financeiro": StatusVinculo.validacao_financeiro,
    "ti": StatusVinculo.tarefa_ti,
}
_AREA_EMAIL_CONFIG = {
    "comercial": "email_comercial",
    "financeiro": "email_financeiro",
    "ti": "email_ti",
}
_FINAL_AREA = "ti"


def _area_atual(vinculo_status: StatusVinculo) -> Optional[str]:
    for area, s in _AREA_STATUS.items():
        if s == vinculo_status:
            return area
    return None


def _registrar_nota(vinculo: Vinculo, area: str, texto: Optional[str], tipo: str):
    if not texto or not texto.strip():
        return
    historico = list(vinculo.historico_observacoes or [])
    historico.append({
        "area": area,
        "texto": texto.strip(),
        "tipo": tipo,
        "data": datetime.now(timezone.utc).isoformat(),
    })
    vinculo.historico_observacoes = historico


def _serialize(v: Vinculo, empresa: Empresa | None = None) -> dict:
    return {
        "id": v.id,
        "numero_pedido": v.numero_pedido,
        "franquia_id": v.franquia_id,
        "franquia_nome": empresa.nome_fantasia or empresa.razao_social if empresa else "—",
        "nome_cliente": v.nome_cliente,
        "cpf": v.cpf,
        "valor_pedido": v.valor_pedido,
        "data_pedido": v.data_pedido.isoformat() if v.data_pedido else None,
        "motivo": v.motivo,
        "necessario_validacao": v.necessario_validacao,
        "quantidade_cupons": v.quantidade_cupons,
        "cupons": v.cupons,
        "status": v.status.value if v.status else None,
        "anexos": v.anexos or [],
        "observacoes_financeiro": v.observacoes_financeiro,
        "justificativa_reprovacao": v.justificativa_reprovacao,
        "destino_reprovacao": v.destino_reprovacao,
        "historico_observacoes": v.historico_observacoes or [],
        "criado_em": v.criado_em.isoformat() if v.criado_em else None,
        "atualizado_em": v.atualizado_em.isoformat() if v.atualizado_em else None,
    }


async def _enrich(v: Vinculo, db: AsyncSession) -> dict:
    empresa_result = await db.execute(select(Empresa).where(Empresa.id == v.franquia_id))
    empresa = empresa_result.scalar_one_or_none()
    return _serialize(v, empresa)



@router.get("")
async def listar_vinculos(
    status_filter: Optional[str] = Query(None, alias="status"),
    franquia_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    query = select(Vinculo)
    if status_filter:
        query = query.where(Vinculo.status == status_filter)
    if franquia_id:
        query = query.where(Vinculo.franquia_id == franquia_id)
    query = query.order_by(Vinculo.criado_em.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    vinculos = result.scalars().all()

    # Busca todas as empresas de uma vez (evita N+1 queries)
    if vinculos:
        franquia_ids = list({v.franquia_id for v in vinculos})
        emp_result = await db.execute(select(Empresa).where(Empresa.id.in_(franquia_ids)))
        empresas_map = {e.id: e for e in emp_result.scalars().all()}
    else:
        empresas_map = {}

    def _build(v: Vinculo) -> dict:
        empresa = empresas_map.get(v.franquia_id)
        return {
            "id": v.id,
            "numero_pedido": v.numero_pedido,
            "franquia_id": v.franquia_id,
            "franquia_nome": empresa.nome_fantasia or empresa.razao_social if empresa else "—",
            "nome_cliente": v.nome_cliente,
            "cpf": v.cpf,
            "valor_pedido": v.valor_pedido,
            "data_pedido": v.data_pedido.isoformat() if v.data_pedido else None,
            "motivo": v.motivo,
            "necessario_validacao": v.necessario_validacao,
            "quantidade_cupons": v.quantidade_cupons,
            "cupons": v.cupons,
            "status": v.status.value if v.status else None,
            "anexos": v.anexos or [],
            "justificativa_reprovacao": v.justificativa_reprovacao,
            "destino_reprovacao": v.destino_reprovacao,
            "criado_em": v.criado_em.isoformat() if v.criado_em else None,
            "atualizado_em": v.atualizado_em.isoformat() if v.atualizado_em else None,
        }

    return [_build(v) for v in vinculos]


@router.get("/{vinculo_id}")
async def obter_vinculo(vinculo_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vinculo).where(Vinculo.id == vinculo_id))
    vinculo = result.scalar_one_or_none()
    if not vinculo:
        raise HTTPException(status_code=404, detail="Vínculo não encontrado")
    return await _enrich(vinculo, db)


@router.post("", status_code=status.HTTP_201_CREATED)
async def criar_vinculo(payload: VinculoCreate, db: AsyncSession = Depends(get_db)):
    logger.info("POST /vinculos recebido: numero_pedido=%s franquia_id=%s", payload.numero_pedido, payload.franquia_id)
    if not payload.franquia_id:
        raise HTTPException(status_code=422, detail="franquia_id é obrigatório")

    # Verifica se franquia existe
    emp = await db.scalar(select(Empresa).where(Empresa.id == payload.franquia_id))
    if not emp:
        raise HTTPException(status_code=422, detail=f"Franquia {payload.franquia_id} não encontrada")

    vinculo = Vinculo(
        numero_pedido=payload.numero_pedido,
        franquia_id=payload.franquia_id,
        nome_cliente=payload.nome_cliente,
        cpf=payload.cpf,
        valor_pedido=payload.valor_pedido,
        data_pedido=payload.data_pedido,
        motivo=payload.motivo,
        necessario_validacao=payload.necessario_validacao,
        quantidade_cupons=payload.quantidade_cupons,
        cupons=[{"valor": float(c.valor)} for c in payload.cupons] if payload.cupons else None,
        status=StatusVinculo.validacao_comercial,
        anexos=payload.anexos,
    )
    db.add(vinculo)
    try:
        await db.flush()
        await db.refresh(vinculo)
        result = await _enrich(vinculo, db)
        # Disparo de email em background (não bloqueia resposta)
        franquia_nome = result.get("franquia_nome", "")
        asyncio.create_task(email_svc.notificar_novo_pedido(
            payload.numero_pedido, payload.nome_cliente, franquia_nome
        ))
        return result
    except IntegrityError as e:
        logger.error("IntegrityError ao criar vinculo: %s", str(e.orig))
        if "numero_pedido" in str(e.orig):
            raise HTTPException(status_code=422, detail=f"Número de pedido '{payload.numero_pedido}' já existe")
        raise HTTPException(status_code=422, detail="Erro de integridade ao salvar pedido")
    except Exception as e:
        logger.error("Erro inesperado ao criar vinculo: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{vinculo_id}/aprovar")
async def aprovar_vinculo(vinculo_id: int, payload: AprovarRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vinculo).where(Vinculo.id == vinculo_id))
    vinculo = result.scalar_one_or_none()
    if not vinculo:
        raise HTTPException(status_code=404, detail="Vínculo não encontrado")

    area_atual = _area_atual(vinculo.status)
    if area_atual is None:
        raise HTTPException(status_code=400, detail=f"Não é possível aprovar com status '{vinculo.status.value}'")

    _registrar_nota(vinculo, area_atual, payload.observacao, "aprovacao")

    if payload.destino == "concluir":
        if area_atual != _FINAL_AREA:
            raise HTTPException(status_code=422, detail=f"Só é possível concluir a partir de {_FINAL_AREA}")
        vinculo.status = StatusVinculo.fechado
    elif payload.destino:
        if payload.destino not in _AREA_STATUS or payload.destino == area_atual:
            raise HTTPException(status_code=422, detail="destino inválido")
        vinculo.status = _AREA_STATUS[payload.destino]
    else:
        # Sem destino explícito: segue o próximo passo padrão de cada área
        if area_atual == "comercial":
            precisa_financeiro = payload.necessario_financeiro if payload.necessario_financeiro is not None else vinculo.necessario_validacao
            vinculo.status = StatusVinculo.validacao_financeiro if precisa_financeiro else StatusVinculo.tarefa_ti
            vinculo.necessario_validacao = precisa_financeiro
        elif area_atual == "financeiro":
            vinculo.status = StatusVinculo.tarefa_ti
        elif area_atual == "ti":
            vinculo.status = StatusVinculo.fechado

    if payload.anexos:
        vinculo.anexos = (vinculo.anexos or []) + payload.anexos
    if area_atual == "financeiro" and payload.observacoes_financeiro is not None:
        vinculo.observacoes_financeiro = payload.observacoes_financeiro

    vinculo.justificativa_reprovacao = None
    vinculo.destino_reprovacao = None
    await db.flush()
    await db.refresh(vinculo)
    result = await _enrich(vinculo, db)

    # Email em background conforme novo status
    franquia_nome = result.get("franquia_nome", "")
    numero = vinculo.numero_pedido
    nome_cli = vinculo.nome_cliente
    if vinculo.status == StatusVinculo.validacao_comercial:
        email_comercial = await db.scalar(select(Configuracao.valor).where(Configuracao.chave == "email_comercial"))
        if email_comercial:
            asyncio.create_task(email_svc.notificar_reprovado(numero, payload.observacao or "Retornado para revisão do Comercial", email_comercial))
    elif vinculo.status == StatusVinculo.validacao_financeiro:
        asyncio.create_task(email_svc.notificar_aprovado_financeiro(numero, nome_cli, franquia_nome))
    elif vinculo.status == StatusVinculo.tarefa_ti:
        asyncio.create_task(email_svc.notificar_aprovado_ti(numero, nome_cli, franquia_nome))
    elif vinculo.status == StatusVinculo.fechado:
        u = await db.scalar(select(Usuario).where(
            Usuario.franquia_id == vinculo.franquia_id,
            Usuario.perfil == PerfilUsuario.franquia,
            Usuario.ativo == True,
        ))
        if u:
            asyncio.create_task(email_svc.notificar_vinculado(numero, nome_cli, u.email))

    return result


@router.put("/{vinculo_id}/reprovar")
async def reprovar_vinculo(vinculo_id: int, payload: ReprovarRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vinculo).where(Vinculo.id == vinculo_id))
    vinculo = result.scalar_one_or_none()
    if not vinculo:
        raise HTTPException(status_code=404, detail="Vínculo não encontrado")

    area_atual = _area_atual(vinculo.status)
    if area_atual is None:
        raise HTTPException(status_code=400, detail=f"Não é possível reprovar com status '{vinculo.status.value}'")

    if payload.destino != "franquia" and (payload.destino not in _AREA_STATUS or payload.destino == area_atual):
        raise HTTPException(status_code=422, detail="destino inválido")

    _registrar_nota(vinculo, area_atual, payload.justificativa, "reprovacao")

    vinculo.status = StatusVinculo.aberto if payload.destino == "franquia" else _AREA_STATUS[payload.destino]
    vinculo.justificativa_reprovacao = payload.justificativa
    vinculo.destino_reprovacao = payload.destino
    await db.flush()
    await db.refresh(vinculo)
    result = await _enrich(vinculo, db)

    # Email conforme destino da reprovação
    numero = vinculo.numero_pedido
    motivo = payload.justificativa
    if payload.destino == "franquia":
        u = await db.scalar(select(Usuario).where(
            Usuario.franquia_id == vinculo.franquia_id,
            Usuario.perfil == PerfilUsuario.franquia,
            Usuario.ativo == True,
        ))
        if u:
            asyncio.create_task(email_svc.notificar_reprovado(numero, motivo, u.email))
    else:
        email_destino = await db.scalar(
            select(Configuracao.valor).where(Configuracao.chave == _AREA_EMAIL_CONFIG[payload.destino])
        )
        if email_destino:
            asyncio.create_task(email_svc.notificar_reprovado(numero, motivo, email_destino))

    return result


@router.put("/{vinculo_id}/reenviar")
async def reenviar_vinculo(vinculo_id: int, payload: ReenviarRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vinculo).where(Vinculo.id == vinculo_id))
    vinculo = result.scalar_one_or_none()
    if not vinculo:
        raise HTTPException(status_code=404, detail="Vínculo não encontrado")

    if vinculo.status != StatusVinculo.aberto:
        raise HTTPException(status_code=400, detail="Só é possível reenviar pedidos com status 'aberto'")

    vinculo.franquia_id = payload.franquia_id
    vinculo.nome_cliente = payload.nome_cliente
    vinculo.cpf = payload.cpf
    vinculo.valor_pedido = payload.valor_pedido
    vinculo.data_pedido = payload.data_pedido
    vinculo.motivo = payload.motivo
    vinculo.necessario_validacao = payload.necessario_validacao
    vinculo.quantidade_cupons = payload.quantidade_cupons
    vinculo.cupons = [{"valor": float(c.valor)} for c in payload.cupons] if payload.cupons else None
    vinculo.anexos = payload.anexos
    vinculo.justificativa_reprovacao = None
    vinculo.destino_reprovacao = None
    vinculo.status = StatusVinculo.validacao_comercial  # sempre volta para comercial

    await db.flush()
    await db.refresh(vinculo)
    return await _enrich(vinculo, db)


@router.delete("/{vinculo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_vinculo(vinculo_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vinculo).where(Vinculo.id == vinculo_id))
    vinculo = result.scalar_one_or_none()
    if not vinculo:
        raise HTTPException(status_code=404, detail="Vinculo nao encontrado")
    if vinculo.status == StatusVinculo.fechado:
        raise HTTPException(status_code=400, detail="Pedidos vinculados não podem ser excluídos")
    await db.delete(vinculo)
    await db.flush()
