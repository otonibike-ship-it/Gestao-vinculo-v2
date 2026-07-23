import io
import csv
import traceback
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.models.pessoa import Empresa
from app.schemas.pessoa import EmpresaCreate, EmpresaResponse

class EmpresaUpdate(BaseModel):
    razao_social: str
    nome_fantasia: Optional[str] = None
    cnpj: str
    email: Optional[str] = None


router = APIRouter()


@router.get("", response_model=List[EmpresaResponse])
async def listar_empresas(skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Empresa).offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/{empresa_id}", response_model=EmpresaResponse)
async def obter_empresa(empresa_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Empresa).where(Empresa.id == empresa_id))
    empresa = result.scalar_one_or_none()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    return empresa


@router.post("", response_model=EmpresaResponse, status_code=status.HTTP_201_CREATED)
async def criar_empresa(payload: EmpresaCreate, db: AsyncSession = Depends(get_db)):
    try:
        # Verificar CNPJ duplicado
        existing = await db.execute(select(Empresa).where(Empresa.cnpj == payload.cnpj))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="CNPJ já cadastrado")
        empresa = Empresa(**payload.model_dump())
        db.add(empresa)
        await db.flush()
        await db.refresh(empresa)
        return empresa
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERRO criar_empresa: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao criar franquia: {str(e)}")


@router.put("/{empresa_id}", response_model=EmpresaResponse)
async def atualizar_empresa(empresa_id: int, payload: EmpresaUpdate, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Empresa).where(Empresa.id == empresa_id))
        empresa = result.scalar_one_or_none()
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")

        # Verificar CNPJ duplicado (excluindo a própria empresa)
        if payload.cnpj != empresa.cnpj:
            existing = await db.execute(
                select(Empresa).where(Empresa.cnpj == payload.cnpj, Empresa.id != empresa_id)
            )
            if existing.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="CNPJ já cadastrado por outra franquia")

        empresa.razao_social = payload.razao_social
        empresa.nome_fantasia = payload.nome_fantasia
        empresa.cnpj = payload.cnpj
        empresa.email = payload.email

        await db.flush()
        await db.refresh(empresa)
        return empresa
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERRO atualizar_empresa: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar franquia: {str(e)}")


@router.delete("/{empresa_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_empresa(empresa_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Empresa).where(Empresa.id == empresa_id))
    empresa = result.scalar_one_or_none()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    await db.delete(empresa)


@router.post("/importar")
async def importar_franquias(
    arquivo: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Importa franquias a partir de um arquivo CSV.

    Colunas esperadas: nome, cnpj, email (opcional), telefone (opcional)
    CNPJs já cadastrados são ignorados (não sobrescritos).
    """
    if not arquivo.filename or not arquivo.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Envie um arquivo .csv")

    conteudo = await arquivo.read()
    try:
        texto = conteudo.decode("utf-8-sig")  # suporta BOM do Excel
    except UnicodeDecodeError:
        texto = conteudo.decode("latin-1")

    reader = csv.DictReader(io.StringIO(texto))

    # Normaliza cabeçalhos para minúsculas sem espaços
    if reader.fieldnames is None:
        raise HTTPException(status_code=400, detail="CSV vazio ou sem cabeçalho")
    reader.fieldnames = [f.strip().lower() for f in reader.fieldnames]

    required = {"nome", "cnpj"}
    if not required.issubset(set(reader.fieldnames)):
        raise HTTPException(
            status_code=400,
            detail=f"Colunas obrigatórias faltando: {required - set(reader.fieldnames)}. "
                   f"Esperado: nome, cnpj, email (opcional), telefone (opcional)",
        )

    criados: list[str] = []
    ignorados: list[str] = []
    erros: list[dict] = []

    for i, row in enumerate(reader, start=2):  # linha 1 é o cabeçalho
        nome = (row.get("nome") or "").strip()
        cnpj_raw = (row.get("cnpj") or "").strip()
        email = (row.get("email") or "").strip() or None
        telefone = (row.get("telefone") or "").strip() or None

        if not nome or not cnpj_raw:
            erros.append({"linha": i, "motivo": "nome ou cnpj em branco"})
            continue

        # Normaliza CNPJ: aceita com ou sem formatação
        cnpj_digits = "".join(c for c in cnpj_raw if c.isdigit())
        if len(cnpj_digits) == 14:
            cnpj = f"{cnpj_digits[:2]}.{cnpj_digits[2:5]}.{cnpj_digits[5:8]}/{cnpj_digits[8:12]}-{cnpj_digits[12:]}"
        else:
            cnpj = cnpj_raw  # mantém como veio e deixa o banco rejeitar se inválido

        try:
            existing = await db.scalar(select(Empresa).where(Empresa.cnpj == cnpj))
            if existing:
                ignorados.append(cnpj)
                continue

            db.add(Empresa(
                razao_social=nome,
                nome_fantasia=nome,
                cnpj=cnpj,
                email=email,
                telefone=telefone,
            ))
            await db.flush()
            criados.append(cnpj)
        except Exception as e:
            erros.append({"linha": i, "cnpj": cnpj, "motivo": str(e)})

    return {
        "criados": len(criados),
        "ignorados": len(ignorados),
        "erros": len(erros),
        "detalhes_erros": erros,
        "cnpjs_ignorados": ignorados,
    }
