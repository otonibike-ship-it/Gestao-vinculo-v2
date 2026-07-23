import os
import subprocess
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, text
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.usuario import Usuario, PerfilUsuario
from app.api.v1.router import api_router
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def _auto_seed():
    """Cria usuario admin se nao existir nenhum usuario."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Usuario).limit(1))
        if result.scalar_one_or_none() is None:
            db.add(Usuario(
                nome="Admin",
                email="admin@vinculo.com",
                senha_hash=pwd_context.hash("admin123"),
                perfil=PerfilUsuario.admin,
                ativo=True,
            ))
            await db.commit()
            print("Auto-seed: usuario admin criado (admin@vinculo.com / admin123)")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Rodar migrations automaticamente
    try:
        subprocess.run(["alembic", "upgrade", "head"], check=True, timeout=30)
        print("Migrations aplicadas com sucesso")
    except Exception as e:
        print(f"Aviso: migration falhou ({e}), tabelas podem ja existir")
    # Auto-seed
    try:
        await _auto_seed()
    except Exception as e:
        print(f"Aviso: auto-seed falhou ({e})")
    yield

app = FastAPI(
    title="Gestão de Vínculo API",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(api_router, prefix="/api/v1")

# Servir uploads como arquivos estáticos
upload_dir = "/app/uploads"
os.makedirs(upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "gestao-vinculo-api"}
