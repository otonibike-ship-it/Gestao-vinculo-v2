# ─────────────────────────────────────────────────────────────
# Gestão de Vínculo — Makefile
# Uso: make <comando>
# ─────────────────────────────────────────────────────────────

.PHONY: up down build logs shell-api shell-db migrate seed test lint

## Sobe todos os serviços em background
up:
	docker compose up -d

## Sobe com logs no terminal
up-log:
	docker compose up

## Para e remove containers (mantém volumes)
down:
	docker compose down

## Para e remove containers + volumes (reset completo)
reset:
	docker compose down -v

## Rebuild das imagens
build:
	docker compose build --no-cache

## Logs em tempo real
logs:
	docker compose logs -f

## Logs de um serviço específico. Ex: make logs-s s=api
logs-s:
	docker compose logs -f $(s)

## Shell dentro do container da API
shell-api:
	docker compose exec api bash

## Shell dentro do PostgreSQL
shell-db:
	docker compose exec postgres psql -U vinculo_user -d vinculo_db

## Rodar migrations
migrate:
	docker compose exec api alembic upgrade head

## Criar nova migration. Ex: make migration name=adiciona_campo_x
migration:
	docker compose exec api alembic revision --autogenerate -m "$(name)"

## Rodar seed de dados de desenvolvimento
seed:
	docker compose exec api python -m app.seed

## Rodar testes do backend
test-back:
	docker compose exec api pytest -v --cov=app

## Rodar testes do frontend
test-front:
	docker compose exec frontend npm run test

## Lint backend
lint-back:
	docker compose exec api ruff check . && black --check .

## Lint frontend
lint-front:
	docker compose exec frontend npm run lint

## Tudo de uma vez: build + up + migrate + seed
setup:
	docker compose build
	docker compose up -d
	@echo "Aguardando banco subir..."
	@sleep 5
	docker compose exec api alembic upgrade head
	docker compose exec api python -m app.seed
	@echo ""
	@echo "✅ Ambiente pronto!"
	@echo "   Frontend: http://localhost:3000"
	@echo "   API:      http://localhost:8000/docs"
	@echo "   Login:    admin@vinculo.com / admin123"
