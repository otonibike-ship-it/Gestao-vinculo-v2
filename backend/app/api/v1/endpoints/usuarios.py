import traceback
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from passlib.context import CryptContext

from app.core.database import get_db
from app.models.usuario import Usuario, PerfilUsuario

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _get_perfil_str(perfil) -> str:
    return perfil.value if hasattr(perfil, 'value') else str(perfil)


# ── Schemas ──────────────────────────────────────────────

class UsuarioCreate(BaseModel):
    nome: str
    email: str
    senha: str
    perfil: str = "comercial"
    franquia_id: Optional[int] = None


class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    senha: Optional[str] = None
    perfil: Optional[str] = None
    franquia_id: Optional[int] = None


class UsuarioResponse(BaseModel):
    id: int
    nome: str
    email: str
    perfil: str
    franquia_id: Optional[int] = None
    ativo: bool


# ── Endpoints ────────────────────────────────────────────

@router.get("")
async def listar_usuarios(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Usuario).order_by(Usuario.nome))
        usuarios = result.scalars().all()
        return [
            UsuarioResponse(
                id=u.id, nome=u.nome, email=u.email,
                perfil=_get_perfil_str(u.perfil),
                franquia_id=u.franquia_id,
                ativo=u.ativo,
            )
            for u in usuarios
        ]
    except Exception as e:
        print(f"ERRO listar_usuarios: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao listar usuarios: {str(e)}")


@router.post("", status_code=status.HTTP_201_CREATED)
async def criar_usuario(payload: UsuarioCreate, db: AsyncSession = Depends(get_db)):
    try:
        existing = await db.execute(select(Usuario).where(Usuario.email == payload.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email ja cadastrado")

        try:
            perfil_enum = PerfilUsuario(payload.perfil)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Perfil invalido: {payload.perfil}")

        usuario = Usuario(
            nome=payload.nome,
            email=payload.email,
            senha_hash=pwd_context.hash(payload.senha),
            perfil=perfil_enum,
            franquia_id=payload.franquia_id,
            ativo=True,
        )
        db.add(usuario)
        await db.flush()
        await db.refresh(usuario)
        return UsuarioResponse(
            id=usuario.id, nome=usuario.nome, email=usuario.email,
            perfil=_get_perfil_str(usuario.perfil),
            franquia_id=usuario.franquia_id,
            ativo=usuario.ativo,
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERRO criar_usuario: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao criar usuario: {str(e)}")


@router.put("/{usuario_id}")
async def atualizar_usuario(usuario_id: int, payload: UsuarioUpdate, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
        usuario = result.scalar_one_or_none()
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario nao encontrado")

        if payload.nome is not None:
            usuario.nome = payload.nome
        if payload.email is not None:
            existing = await db.execute(
                select(Usuario).where(Usuario.email == payload.email, Usuario.id != usuario_id)
            )
            if existing.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Email ja cadastrado")
            usuario.email = payload.email
        if payload.senha is not None:
            usuario.senha_hash = pwd_context.hash(payload.senha)
        if payload.perfil is not None:
            try:
                usuario.perfil = PerfilUsuario(payload.perfil)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Perfil invalido: {payload.perfil}")
        if payload.franquia_id is not None:
            usuario.franquia_id = payload.franquia_id

        await db.flush()
        await db.refresh(usuario)
        return UsuarioResponse(
            id=usuario.id, nome=usuario.nome, email=usuario.email,
            perfil=_get_perfil_str(usuario.perfil),
            franquia_id=usuario.franquia_id,
            ativo=usuario.ativo,
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERRO atualizar_usuario: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar usuario: {str(e)}")


@router.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_usuario(usuario_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    usuario = result.scalar_one_or_none()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    await db.delete(usuario)
    await db.flush()
