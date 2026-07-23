import smtplib
import logging
from email.mime.text import MIMEText
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.models.configuracao import Configuracao

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("")
async def listar_configuracoes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Configuracao))
    return {row.chave: row.valor for row in result.scalars().all()}


class ConfiguracaoPayload(BaseModel):
    valores: dict[str, str]


@router.put("")
async def salvar_configuracoes(payload: ConfiguracaoPayload, db: AsyncSession = Depends(get_db)):
    for chave, valor in payload.valores.items():
        result = await db.execute(select(Configuracao).where(Configuracao.chave == chave))
        cfg = result.scalar_one_or_none()
        if cfg:
            cfg.valor = valor
        else:
            db.add(Configuracao(chave=chave, valor=valor))
    await db.flush()
    result = await db.execute(select(Configuracao))
    return {row.chave: row.valor for row in result.scalars().all()}


class TesteEmailPayload(BaseModel):
    destinatario: str


@router.post("/testar-email")
async def testar_email(payload: TesteEmailPayload, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Configuracao))
    cfg = {row.chave: row.valor for row in result.scalars().all()}

    host = cfg.get("smtp_host", "smtp.gmail.com")
    port = int(cfg.get("smtp_port", 587))
    user = cfg.get("smtp_user", "")
    password = cfg.get("smtp_password", "")
    tls = cfg.get("smtp_tls", "true").lower() == "true"

    msg = MIMEText("Teste de configuração SMTP — Gestão de Vínculo SenseBike.", "plain", "utf-8")
    msg["Subject"] = "Teste de Email — Gestão de Vínculo"
    msg["From"] = f"Gestão de Vínculo <{user}>"
    msg["To"] = payload.destinatario

    try:
        with smtplib.SMTP(host, port, timeout=15) as server:
            if tls:
                server.starttls()
            server.login(user, password)
            server.sendmail(user, [payload.destinatario], msg.as_string())
        return {"ok": True, "mensagem": f"Email enviado para {payload.destinatario}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Falha ao enviar: {str(e)}")
