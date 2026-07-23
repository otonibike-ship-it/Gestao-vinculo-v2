"""
Seed — dados iniciais para desenvolvimento local
Execute: python -m app.seed
"""
import asyncio
from datetime import date
from decimal import Decimal
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.usuario import Usuario, PerfilUsuario
from app.models.pessoa import Empresa
from app.models.vinculo import Vinculo, StatusVinculo
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def seed():
    async with AsyncSessionLocal() as db:
        # ── Usuários (só cria se não existir) ──────────────────────────────
        usuarios_seed = [
            {"nome": "Admin",           "email": "admin@vinculo.com",      "senha": "admin123", "perfil": PerfilUsuario.admin},
            {"nome": "Equipe Comercial","email": "comercial@vinculo.com",  "senha": "123456",   "perfil": PerfilUsuario.comercial},
            {"nome": "Equipe Financeiro","email":"financeiro@vinculo.com", "senha": "123456",   "perfil": PerfilUsuario.financeiro},
            {"nome": "Equipe TI",       "email": "ti@vinculo.com",         "senha": "123456",   "perfil": PerfilUsuario.ti},
            {"nome": "Equipe Faturamento","email":"faturamento@vinculo.com","senha": "123456",  "perfil": PerfilUsuario.faturamento},
        ]
        for u in usuarios_seed:
            existing = await db.scalar(select(Usuario).where(Usuario.email == u["email"]))
            if not existing:
                db.add(Usuario(
                    nome=u["nome"],
                    email=u["email"],
                    senha_hash=pwd_context.hash(u["senha"]),
                    perfil=u["perfil"],
                    ativo=True,
                ))
                print(f"  + Usuário criado: {u['email']}")
            else:
                print(f"  ~ Usuário já existe: {u['email']}")

        # ── Franquias (só cria se não existir pelo CNPJ) ──────────────────
        franquias_seed = [
            {"razao_social": "SenseBike Matriz Ltda", "cnpj": "12.345.678/0001-90", "nome_fantasia": "SenseBike Matriz", "email": "contato@sensebike.com.br"},
            {"razao_social": "SenseBike Filial SP",   "cnpj": "98.765.432/0001-10", "nome_fantasia": "SenseBike SP",     "email": "sp@sensebike.com.br"},
            {"razao_social": "SenseBike Filial RJ",   "cnpj": "11.222.333/0001-44", "nome_fantasia": "SenseBike RJ",     "email": "rj@sensebike.com.br"},
        ]
        franquia_ids = []
        for f in franquias_seed:
            existing = await db.scalar(select(Empresa).where(Empresa.cnpj == f["cnpj"]))
            if not existing:
                obj = Empresa(**f)
                db.add(obj)
                await db.flush()
                franquia_ids.append(obj.id)
                print(f"  + Franquia criada: {f['nome_fantasia']}")
            else:
                franquia_ids.append(existing.id)
                print(f"  ~ Franquia já existe: {f['nome_fantasia']}")

        # ── Vínculos de teste (só cria se o número de pedido não existir) ──
        vinculos_seed = [
            {"numero_pedido": "PED-001", "franquia_idx": 0, "nome_cliente": "João Silva",   "valor_pedido": Decimal("1500.00"), "data_pedido": date(2026, 3, 10), "necessario_validacao": True,  "status": StatusVinculo.validacao_financeiro, "justificativa_reprovacao": None},
            {"numero_pedido": "PED-002", "franquia_idx": 1, "nome_cliente": "Maria Santos", "valor_pedido": Decimal("3200.50"), "data_pedido": date(2026, 3, 12), "necessario_validacao": False, "status": StatusVinculo.tarefa_ti,           "justificativa_reprovacao": None},
            {"numero_pedido": "PED-003", "franquia_idx": 0, "nome_cliente": "Pedro Costa",  "valor_pedido": Decimal("850.00"),  "data_pedido": date(2026, 3, 14), "necessario_validacao": True,  "status": StatusVinculo.fechado,             "justificativa_reprovacao": None},
            {"numero_pedido": "PED-004", "franquia_idx": 2, "nome_cliente": "Ana Oliveira", "valor_pedido": Decimal("2100.00"), "data_pedido": date(2026, 3, 15), "necessario_validacao": False, "status": StatusVinculo.aberto,              "justificativa_reprovacao": "Dados do cliente incompletos"},
            {"numero_pedido": "PED-005", "franquia_idx": 1, "nome_cliente": "Carlos Mendes","valor_pedido": Decimal("4500.00"), "data_pedido": date(2026, 3, 16), "necessario_validacao": True,  "status": StatusVinculo.validacao_financeiro, "justificativa_reprovacao": None},
        ]
        for v in vinculos_seed:
            existing = await db.scalar(select(Vinculo).where(Vinculo.numero_pedido == v["numero_pedido"]))
            if not existing:
                db.add(Vinculo(
                    numero_pedido=v["numero_pedido"],
                    franquia_id=franquia_ids[v["franquia_idx"]],
                    nome_cliente=v["nome_cliente"],
                    valor_pedido=v["valor_pedido"],
                    data_pedido=v["data_pedido"],
                    necessario_validacao=v["necessario_validacao"],
                    status=v["status"],
                    justificativa_reprovacao=v["justificativa_reprovacao"],
                    anexos=[],
                ))
                print(f"  + Vínculo criado: {v['numero_pedido']}")
            else:
                print(f"  ~ Vínculo já existe: {v['numero_pedido']}")

        await db.commit()
        print("")
        print("✅ Seed concluído!")
        print("")
        print("Usuários de teste:")
        print("  comercial@vinculo.com  / 123456    (Comercial)")
        print("  financeiro@vinculo.com / 123456    (Financeiro)")
        print("  ti@vinculo.com         / 123456    (TI)")
        print("  faturamento@vinculo.com/ 123456    (Faturamento)")
        print("  admin@vinculo.com      / admin123  (Admin)")


if __name__ == "__main__":
    asyncio.run(seed())
