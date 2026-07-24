# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Backend:** FastAPI + SQLAlchemy 2 (async) + PostgreSQL + Alembic migrations
- **Frontend:** Next.js 14 App Router + TypeScript + TailwindCSS + React Query + Axios
- **Infrastructure:** Docker Compose (frontend, api, postgres, redis)
- **File storage:** Cloudinary (direct browser upload — bypasses Nginx timeout)

## Common Commands

All day-to-day operations use `make`:

```bash
make setup          # First-time: build + up + migrate + seed
make up             # Start all services (background)
make down           # Stop services
make logs           # Tail all logs
make logs-s s=api   # Tail a single service

make migrate        # Run pending Alembic migrations
make migration name=add_campo_x   # Generate new migration
make seed           # Re-run seed (idempotent — skips existing records)

make shell-api      # bash inside the API container
make shell-db       # psql inside PostgreSQL

make lint-back      # ruff + black check
make lint-front     # next lint
make test-back      # pytest with coverage
make test-front     # vitest
```

Frontend and API are only accessible via Docker. Do not run `npm run dev` or `uvicorn` directly on the host.

Access points after `make up`:
- Frontend: http://localhost:3000
- API docs: http://localhost:8000/docs

## Architecture

### Workflow / Business Logic

The system manages franchise link requests (`Vinculo`) through a 3-step approval pipeline:

```
Franquia submits → validacao_comercial → (if financeiro needed) validacao_financeiro → tarefa_ti → fechado
                                                                                    ↑
                                        reprovar at any stage → aberto (returned to franquia)
```

Status enum lives in `backend/app/models/vinculo.py` (`StatusVinculo`). The approve/reject logic (which status transitions to which) is entirely in `backend/app/api/v1/endpoints/vinculo.py`.

A second, independent form — **Troca de Pedido** — has its own table (`troca_pedidos`), model (`app/models/troca_pedido.py`), and endpoints (`app/api/v1/endpoints/troca_pedido.py`, prefix `/trocas-pedido`). It does **not** share the Vinculo pipeline; it uses a 3-way triage instead:

```
Franquia/Comercial submits → aguardando_comercial
  Comercial aprova (escolhe destino: Faturamento | Financeiro | TI) → aguardando_{destino}
    Equipe destino aprova → fechado
    Equipe destino reprova → aberto (returned to franquia)
  Comercial reprova → aberto (returned to franquia)
```

Unlike Vinculo, reprovação at any stage always returns to the franquia (no destino picker on reject). This is the template for form types added after Vinculo — **Troca de Pedido** and **Link de Pagamento** so far, with **Checklist Bike Shop**, **Carta de Correção**, and **Solicitação de Estorno** still to come. Each gets its own dedicated table/endpoint/modal following this same pattern, not a shared polymorphic model.

**Link de Pagamento** (`links_pagamento` table, `app/models/link_pagamento.py`, endpoints at `/links-pagamento`) is a second implementation of the identical 3-way triage state machine, just with its own field set (motivo, valor do pedido/link, parcelas 1x-18x, dados do cliente com CPF/telefone mascarados). When adding the next form type, copy this pattern (model + schema + endpoint + email functions + migration + service + form + modal + dashboard wiring) rather than generalizing early.

### User Profiles & Routing

`PerfilUsuario` enum: `comercial`, `financeiro`, `ti`, `admin`, `franquia`, `faturamento`

Each profile lands on a different dashboard after login:
- comercial → `/comercial` (sees all vinculos, trocas de pedido and links de pagamento, creates new ones)
- faturamento → `/faturamento` (sees trocas/links with `aguardando_faturamento`)
- financeiro → `/financeiro` (sees `validacao_financeiro` vinculos + `aguardando_financeiro` trocas/links)
- ti → `/ti` (sees `tarefa_ti` vinculos + `aguardando_ti` trocas/links)
- admin → `/comercial` (full access)
- franquia → `/franquia` (sees only their own franquia's vinculos, trocas de pedido and links de pagamento)

`franquia` profile users have `franquia_id` set on their `Usuario` record; this is stored in `localStorage` at login and used to pre-fill and filter forms.

### Authentication Flow

1. POST `/api/v1/auth/login` (OAuth2 form) → returns `access_token`, `refresh_token`, `perfil`, `nome`, `franquia_id`
2. Frontend (`auth.ts`) stores token in `localStorage` AND as a cookie (`access_token`) for SSR
3. `frontend/src/middleware.ts` reads the cookie server-side to redirect unauthenticated requests before React renders
4. `frontend/src/lib/api.ts` injects the token via a request interceptor using an in-memory cache (`_tokenCache`) — avoids reading `localStorage` on every request

**SSR gotcha:** All `authService` calls (and any `localStorage` reads) must be inside `useEffect` or guarded by `typeof window === 'undefined'`, or they will crash during SSR.

### Backend Session / Background Tasks

`get_db()` commits and closes the session when the endpoint returns. Any `asyncio.create_task()` call runs **after** that — so it must **not** use the request's `db` session.

`backend/app/services/email.py` creates its own session via `AsyncSessionLocal()` for this reason. Follow the same pattern for any other background async work.

### Email Notifications

`email.py` reads SMTP config and templates from the `configuracoes` table (key/value store) on every send. Templates use `str.format()` with named placeholders (`{numero_pedido}`, `{nome_cliente}`, `{franquia_nome}`, `{motivo}`).

Notifications are dispatched with `asyncio.create_task(email_svc.notificar_*(…))` inside `vinculo.py` endpoints — fire-and-forget, non-blocking.

Gmail requires an App Password (not the account password) when 2-Step Verification is enabled.

### File Uploads

Uploads go **directly from the browser to Cloudinary** using an unsigned preset (`gestao-vinculo`). The upload logic lives in `frontend/src/services/vinculo.ts` (`uploadService.upload()`). The backend never touches the file bytes — `anexos` on `Vinculo` stores an array of Cloudinary secure URLs.

### Key Backend Files

| File | Purpose |
|---|---|
| `app/models/vinculo.py` | `Vinculo` model + `StatusVinculo` enum |
| `app/models/troca_pedido.py` | `TrocaPedido` model + `StatusTrocaPedido` enum |
| `app/models/link_pagamento.py` | `LinkPagamento` model + `StatusLinkPagamento` enum |
| `app/models/usuario.py` | `Usuario` model + `PerfilUsuario` enum |
| `app/models/configuracao.py` | Key/value config store (SMTP, templates) |
| `app/api/v1/endpoints/vinculo.py` | All vinculo CRUD + approve/reject logic |
| `app/api/v1/endpoints/troca_pedido.py` | All troca de pedido CRUD + 3-way triage logic |
| `app/api/v1/endpoints/link_pagamento.py` | All link de pagamento CRUD + 3-way triage logic |
| `app/api/v1/endpoints/configuracoes.py` | SMTP config + email template management |
| `app/services/email.py` | Email sending (creates own DB session) |
| `app/services/auth_service.py` | JWT generation + password validation |
| `app/core/database.py` | Async engine, `get_db` dependency, `AsyncSessionLocal` |
| `alembic/versions/` | 8 migrations; latest is `0008_link_pagamento.py` |

### Key Frontend Files

| File | Purpose |
|---|---|
| `src/middleware.ts` | Server-side auth redirect (reads `access_token` cookie) |
| `src/lib/api.ts` | Axios instance with auth interceptor |
| `src/services/auth.ts` | Login/logout, localStorage, in-memory token cache |
| `src/services/vinculo.ts` | Vinculo API calls + Cloudinary upload (`uploadService`, reused by other forms) |
| `src/services/troca-pedido.ts` | Troca de Pedido API calls |
| `src/services/link-pagamento.ts` | Link de Pagamento API calls |
| `src/components/vinculo-modal.tsx` | Approve/reject modal (Financeiro and TI dashboards) |
| `src/components/troca-pedido-modal.tsx` | Approve/reject modal (Comercial/Faturamento/Financeiro/TI) |
| `src/components/link-pagamento-modal.tsx` | Approve/reject modal (Comercial/Faturamento/Financeiro/TI) |
| `src/components/novo-pedido-form.tsx` | New order form (Comercial) |
| `src/components/troca-pedido-form.tsx` | New troca de pedido form |
| `src/components/link-pagamento-form.tsx` | New link de pagamento form (CPF/telefone masks) |
| `src/app/(dashboard)/configuracoes/page.tsx` | SMTP + email template settings (admin only) |

## Test Credentials (seed)

| Email | Password | Profile |
|---|---|---|
| admin@vinculo.com | admin123 | admin |
| comercial@vinculo.com | 123456 | comercial |
| faturamento@vinculo.com | 123456 | faturamento |
| financeiro@vinculo.com | 123456 | financeiro |
| ti@vinculo.com | 123456 | ti |
