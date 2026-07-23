from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from app.core.database import get_db
from app.models.pessoa import Pessoa, Empresa
from app.schemas.pessoa import PessoaCreate, PessoaResponse, EmpresaCreate, EmpresaResponse

router = APIRouter()


@router.get("/", response_model=List[PessoaResponse])
async def listar_pessoas(skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Pessoa).offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/{pessoa_id}", response_model=PessoaResponse)
async def obter_pessoa(pessoa_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Pessoa).where(Pessoa.id == pessoa_id))
    pessoa = result.scalar_one_or_none()
    if not pessoa:
        raise HTTPException(status_code=404, detail="Pessoa não encontrada")
    return pessoa


@router.post("/", response_model=PessoaResponse, status_code=status.HTTP_201_CREATED)
async def criar_pessoa(payload: PessoaCreate, db: AsyncSession = Depends(get_db)):
    pessoa = Pessoa(**payload.model_dump())
    db.add(pessoa)
    await db.flush()
    await db.refresh(pessoa)
    return pessoa


@router.delete("/{pessoa_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_pessoa(pessoa_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Pessoa).where(Pessoa.id == pessoa_id))
    pessoa = result.scalar_one_or_none()
    if not pessoa:
        raise HTTPException(status_code=404, detail="Pessoa não encontrada")
    await db.delete(pessoa)
