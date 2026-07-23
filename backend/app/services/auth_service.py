from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.schemas.auth import Token
from app.models.usuario import Usuario

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _criar_token(self, data: dict, expires_delta: timedelta) -> str:
        payload = data.copy()
        payload["exp"] = datetime.utcnow() + expires_delta
        return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    async def autenticar(self, email: str, senha: str) -> Optional[dict]:
        result = await self.db.execute(select(Usuario).where(Usuario.email == email))
        usuario = result.scalar_one_or_none()

        if not usuario or not pwd_context.verify(senha, usuario.senha_hash):
            return None

        if not usuario.ativo:
            return None

        perfil_str = usuario.perfil.value if hasattr(usuario.perfil, 'value') else str(usuario.perfil)
        token_data = {"sub": str(usuario.id), "email": usuario.email, "perfil": perfil_str}
        if usuario.franquia_id:
            token_data["franquia_id"] = usuario.franquia_id

        access = self._criar_token(token_data, timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES))
        refresh = self._criar_token(
            {"sub": str(usuario.id), "type": "refresh"},
            timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
        )
        return {
            "access_token": access,
            "refresh_token": refresh,
            "token_type": "bearer",
            "perfil": perfil_str,
            "nome": usuario.nome,
            "franquia_id": usuario.franquia_id,
        }

    async def renovar_token(self, refresh_token: str) -> Optional[Token]:
        try:
            payload = jwt.decode(
                refresh_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
            )
            if payload.get("type") != "refresh":
                return None
            user_id = payload.get("sub")
            access = self._criar_token(
                {"sub": user_id},
                timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
            )
            new_refresh = self._criar_token(
                {"sub": user_id, "type": "refresh"},
                timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
            )
            return Token(access_token=access, refresh_token=new_refresh)
        except JWTError:
            return None
