from dataclasses import dataclass
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.usuario import Usuario

_bearer = HTTPBearer(auto_error=False)


@dataclass
class CurrentUser:
    id: int
    perfil: str
    franquia_id: Optional[int]


def _nao_autenticado() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    if not creds:
        raise _nao_autenticado()
    try:
        payload = jwt.decode(creds.credentials, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise _nao_autenticado()
    if payload.get("type") == "refresh" or not payload.get("sub"):
        raise _nao_autenticado()
    try:
        user_id = int(payload["sub"])
    except (TypeError, ValueError):
        raise _nao_autenticado()

    # Perfil e franquia vêm do banco (não do token), para que alterações feitas pelo admin
    # e usuários desativados valham imediatamente.
    usuario = await db.scalar(select(Usuario).where(Usuario.id == user_id))
    if not usuario or not usuario.ativo:
        raise _nao_autenticado()
    perfil = usuario.perfil.value if hasattr(usuario.perfil, "value") else str(usuario.perfil)
    return CurrentUser(id=usuario.id, perfil=perfil, franquia_id=usuario.franquia_id)


def require_perfis(*perfis: str):
    async def _dep(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.perfil not in perfis:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")
        return user

    return _dep


def escopo_franquia(user: CurrentUser, franquia_id: Optional[int]) -> Optional[int]:
    """Usuário de franquia só enxerga/cria a própria franquia; os demais usam o valor pedido."""
    if user.perfil == "franquia":
        if not user.franquia_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário sem franquia vinculada")
        return user.franquia_id
    return franquia_id


def checar_franquia(user: CurrentUser, franquia_id: Optional[int]) -> None:
    if user.perfil == "franquia" and (not user.franquia_id or user.franquia_id != franquia_id):
        # 404 (e não 403) para não revelar que o registro existe
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro não encontrado")


def bloquear_franquia(user: CurrentUser) -> None:
    if user.perfil == "franquia":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")
