import asyncio
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.usuario import Usuario
from app.models.configuracao import Configuracao
from app.schemas.auth import RefreshTokenRequest
from app.services.auth_service import AuthService
from app.services import email as email_svc

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class EsqueciSenhaRequest(BaseModel):
    email: str


class RedefinirSenhaRequest(BaseModel):
    token: str
    nova_senha: str


@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    result = await service.autenticar(form_data.username, form_data.password)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return result


@router.post("/refresh")
async def refresh(payload: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    token = await service.renovar_token(payload.refresh_token)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
        )
    return token


@router.post("/esqueci-senha")
async def esqueci_senha(payload: EsqueciSenhaRequest, db: AsyncSession = Depends(get_db)):
    # Sempre retorna 200 para não vazar se o e-mail existe
    usuario = await db.scalar(select(Usuario).where(Usuario.email == payload.email, Usuario.ativo == True))
    if not usuario:
        return {"ok": True}

    token = secrets.token_urlsafe(32)
    usuario.reset_token = token
    usuario.reset_token_expira_em = datetime.now(timezone.utc) + timedelta(hours=1)
    await db.flush()

    app_url = await db.scalar(select(Configuracao.valor).where(Configuracao.chave == "app_url")) or "http://localhost:3000"
    link = f"{app_url}/redefinir-senha?token={token}"

    asyncio.create_task(email_svc.notificar_reset_senha(usuario.email, usuario.nome, link))
    return {"ok": True}


@router.post("/redefinir-senha")
async def redefinir_senha(payload: RedefinirSenhaRequest, db: AsyncSession = Depends(get_db)):
    if len(payload.nova_senha) < 6:
        raise HTTPException(status_code=422, detail="A senha deve ter no mínimo 6 caracteres")

    usuario = await db.scalar(
        select(Usuario).where(Usuario.reset_token == payload.token, Usuario.ativo == True)
    )
    if not usuario:
        raise HTTPException(status_code=400, detail="Token inválido")

    agora = datetime.now(timezone.utc)
    expira = usuario.reset_token_expira_em
    if expira is None or (expira.tzinfo is None and expira < datetime.utcnow()) or (expira.tzinfo is not None and expira < agora):
        raise HTTPException(status_code=400, detail="Token expirado. Solicite um novo link.")

    usuario.senha_hash = pwd_context.hash(payload.nova_senha)
    usuario.reset_token = None
    usuario.reset_token_expira_em = None
    await db.flush()
    return {"ok": True}
