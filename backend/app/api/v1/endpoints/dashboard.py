from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.vinculo import Vinculo, StatusVinculo

router = APIRouter()


@router.get("/stats")
async def dashboard_stats(db: AsyncSession = Depends(get_db)):
    # 1 query com GROUP BY em vez de 5 queries COUNT separadas
    result = await db.execute(
        select(Vinculo.status, func.count(Vinculo.id))
        .group_by(Vinculo.status)
    )
    counts: dict[str, int] = {row[0].value: row[1] for row in result.all()}

    total = sum(counts.values())
    return {
        "total": total,
        "abertos": counts.get(StatusVinculo.aberto.value, 0),
        "validacao_comercial": counts.get(StatusVinculo.validacao_comercial.value, 0),
        "validacao_financeiro": counts.get(StatusVinculo.validacao_financeiro.value, 0),
        "tarefa_ti": counts.get(StatusVinculo.tarefa_ti.value, 0),
        "fechados": counts.get(StatusVinculo.fechado.value, 0),
    }
