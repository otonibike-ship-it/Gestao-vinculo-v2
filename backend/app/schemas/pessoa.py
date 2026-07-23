from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


class PessoaBase(BaseModel):
    nome: str
    cpf: str
    email: Optional[str] = None
    telefone: Optional[str] = None
    data_nascimento: Optional[date] = None

class PessoaCreate(PessoaBase):
    pass

class PessoaResponse(PessoaBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True


class EmpresaBase(BaseModel):
    razao_social: str
    cnpj: str
    nome_fantasia: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None

class EmpresaCreate(EmpresaBase):
    pass

class EmpresaResponse(EmpresaBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True
