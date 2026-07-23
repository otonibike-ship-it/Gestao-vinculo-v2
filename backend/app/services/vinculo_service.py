from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.models.vinculo import Vinculo
from app.schemas.vinculo import VinculoCreate, VinculoUpdate


class VinculoService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def listar(self, skip: int = 0, limit: int = 50) -> List[Vinculo]:
        result = await self.db.execute(
            select(Vinculo).offset(skip).limit(limit)
        )
        return result.scalars().all()

    async def obter(self, vinculo_id: int) -> Optional[Vinculo]:
        result = await self.db.execute(
            select(Vinculo).where(Vinculo.id == vinculo_id)
        )
        return result.scalar_one_or_none()

    async def criar(self, payload: VinculoCreate) -> Vinculo:
        vinculo = Vinculo(**payload.model_dump())
        self.db.add(vinculo)
        await self.db.flush()
        await self.db.refresh(vinculo)
        return vinculo

    async def atualizar(self, vinculo_id: int, payload: VinculoUpdate) -> Optional[Vinculo]:
        vinculo = await self.obter(vinculo_id)
        if not vinculo:
            return None
        dados = payload.model_dump(exclude_unset=True)
        for campo, valor in dados.items():
            setattr(vinculo, campo, valor)
        await self.db.flush()
        await self.db.refresh(vinculo)
        return vinculo

    async def remover(self, vinculo_id: int) -> bool:
        vinculo = await self.obter(vinculo_id)
        if not vinculo:
            return False
        await self.db.delete(vinculo)
        return True
