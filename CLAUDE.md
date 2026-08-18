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

Five other forms each have their own table, model, and endpoint (not a shared polymorphic model — copy the closest existing form: model + schema + endpoint + email functions + migration + service + form + modal + dashboard wiring rather than generalizing early). There is **no Checklist Bike Shop** — it was deliberately dropped (too rarely used) in favor of **Cancelamento de Venda**. The six live forms are: Vinculo, **Troca de Pedido**, **Link de Pagamento**, **Carta de Correção**, **Solicitação de Estorno**, **Cancelamento de Venda**.

**All five non-Vinculo forms were reworked (2026-08-04/05) from the original shared 3-way-triage template into distinct, fixed per-form pipelines.** Comercial no longer picks a destino (Faturamento | Financeiro | TI) on any of them — each form always routes to the same next team(s). Comercial's own initial reject (from `aguardando_comercial`) always goes straight to the franquia, justificativa required, no picker. Beyond that, each form's target-team reject behavior differs — confirmed individually with the user, not assumed:

```
Troca de Pedido (troca_pedido.py, /trocas-pedido):
  Franquia/Comercial submits → aguardando_comercial
    Comercial aprova (observação opcional) → aguardando_faturamento
      Faturamento aprova (observação opcional) → aguardando_ti
        TI aprova → fechado ("Finalizado")
        TI reprova (destino comercial|franquia, justificativa opcional) → aguardando_comercial | aberto
      Faturamento reprova (destino comercial|franquia, justificativa opcional) → aguardando_comercial | aberto
    Comercial reprova (justificativa obrigatória) → aberto (volta pra franquia)

Link de Pagamento (link_pagamento.py, /links-pagamento):
  Franquia/Comercial submits → aguardando_comercial
    Comercial aprova (sem campo obrigatório) → aguardando_financeiro
      Financeiro aprova (preenche link_gerado, campo obrigatório) → fechado ("Link Gerado")
      Financeiro reprova (justificativa obrigatória) → aberto (SEMPRE franquia, sem picker — reprovado por engano na v1, corrigido)
    Comercial reprova (justificativa obrigatória) → aberto (volta pra franquia)
  franquia vê o link_gerado num pop-up de leitura no próprio modal.

Carta de Correção (carta_correcao.py, /cartas-correcao):
  Franquia/Comercial submits → aguardando_comercial
    Comercial aprova (observação opcional) → aguardando_financeiro
      Financeiro aprova (anexo opcional, pra NF corrigida em PDF) → fechado ("Carta Gerada")
      Financeiro reprova (justificativa obrigatória) → aberto (SEMPRE franquia, sem picker)
    Comercial reprova (justificativa obrigatória) → aberto (volta pra franquia)

Solicitação de Estorno (solicitacao_estorno.py, /solicitacoes-estorno):
  Franquia/Comercial submits → aguardando_comercial
    Comercial aprova (observação opcional) → aguardando_financeiro
      Financeiro aprova (anexo opcional) → fechado ("Estorno Realizado")
      Financeiro reprova (destino comercial|franquia, justificativa obrigatória) → aguardando_comercial | aberto
    Comercial reprova (justificativa obrigatória) → aberto (volta pra franquia)

Cancelamento de Venda (cancelamento_venda.py, /cancelamentos-venda):
  Franquia/Comercial submits → aguardando_comercial
    Comercial aprova (observação opcional) → aguardando_faturamento
      Faturamento aprova (anexo opcional) → aguardando_financeiro
        Financeiro aprova (anexo opcional) → fechado ("Estorno Realizado")
        Financeiro reprova (destino comercial|franquia, justificativa obrigatória) → aguardando_comercial | aberto
      Faturamento reprova (destino comercial|franquia, justificativa obrigatória) → aguardando_comercial | aberto
    Comercial reprova (justificativa obrigatória) → aberto (volta pra franquia)
```

`aguardando_ti` remains in `StatusLinkPagamento`/`StatusCartaCorrecao`/`StatusSolicitacaoEstorno`/`StatusCancelamentoVenda`, and `aguardando_financeiro` remains unused-but-present in `StatusTrocaPedido` (harmless — Alembic can't easily drop Postgres enum values) — dead now that each form is fixed at its own two/three-stage pipeline. The dashboard sections that still query those dead statuses (e.g. TI's queue for these forms) render as permanently-empty sections rather than being removed — a known cosmetic gap, not a bug.

Two things worth knowing before adding a 7th form:
- **Dropdown "motivo" fields** store the full option text as the value (see `frontend/src/components/carta-correcao-selects.tsx` for the two-select pattern), matching `MotivoSelect`/`TrocaMotivoSelect` — not a coded enum.
- **`CancelamentoVenda` has two independent attachment arrays** (`anexos_evidencias_uso`, `anexos_portal_comprovante`) instead of the single `anexos` every other form uses — its `AprovarCancelamentoRequest.anexos` payload merges into `anexos_portal_comprovante` on approve. Its modal also skips the inline "Editar e Reenviar" flow (too many fields split across two attachment types); a reprovado record just tells the franquia to submit a new one. The `/reenviar` endpoint still exists for API consistency but the frontend doesn't call it.

### User Profiles & Routing

`PerfilUsuario` enum: `comercial`, `financeiro`, `ti`, `admin`, `franquia`, `faturamento`

Each profile lands on a different dashboard after login:
- comercial → `/comercial` (sees everything across all 6 forms, creates new ones)
- faturamento → `/faturamento` (sees every form's `aguardando_faturamento` queue)
- financeiro → `/financeiro` (sees `validacao_financeiro` vinculos + every other form's `aguardando_financeiro` queue)
- ti → `/ti` (sees `tarefa_ti` vinculos + every other form's `aguardando_ti` queue)
- admin → `/comercial` (full access)
- franquia → `/franquia` (sees only their own franquia's records across all 6 forms)

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
| `app/models/carta_correcao.py` | `CartaCorrecao` model + `StatusCartaCorrecao` enum |
| `app/models/solicitacao_estorno.py` | `SolicitacaoEstorno` model + `StatusSolicitacaoEstorno` enum |
| `app/models/cancelamento_venda.py` | `CancelamentoVenda` model (2 anexo arrays) + `StatusCancelamentoVenda` enum |
| `app/models/usuario.py` | `Usuario` model + `PerfilUsuario` enum |
| `app/models/configuracao.py` | Key/value config store (SMTP, templates) |
| `app/api/v1/endpoints/vinculo.py` | All vinculo CRUD + approve/reject logic |
| `app/api/v1/endpoints/troca_pedido.py` | All troca de pedido CRUD + fixed Comercial→Faturamento→TI pipeline |
| `app/api/v1/endpoints/link_pagamento.py` | All link de pagamento CRUD + fixed Comercial→Financeiro pipeline (`link_gerado`) |
| `app/api/v1/endpoints/carta_correcao.py` | All carta de correção CRUD + fixed Comercial→Financeiro pipeline |
| `app/api/v1/endpoints/solicitacao_estorno.py` | All solicitação de estorno CRUD + fixed Comercial→Financeiro pipeline |
| `app/api/v1/endpoints/cancelamento_venda.py` | All cancelamento de venda CRUD + 3-way triage logic |
| `app/api/v1/endpoints/configuracoes.py` | SMTP config + email template management |
| `app/services/email.py` | Email sending (creates own DB session) |
| `app/services/auth_service.py` | JWT generation + password validation |
| `app/core/database.py` | Async engine, `get_db` dependency, `AsyncSessionLocal` |
| `alembic/versions/` | 11 migrations; latest is `0011_cancelamento_venda.py` |

### Key Frontend Files

| File | Purpose |
|---|---|
| `src/middleware.ts` | Server-side auth redirect (reads `access_token` cookie) |
| `src/lib/api.ts` | Axios instance with auth interceptor |
| `src/services/auth.ts` | Login/logout, localStorage, in-memory token cache |
| `src/services/vinculo.ts` | Vinculo API calls + Cloudinary upload (`uploadService`, reused by other forms) |
| `src/services/troca-pedido.ts` | Troca de Pedido API calls |
| `src/services/link-pagamento.ts` | Link de Pagamento API calls |
| `src/services/carta-correcao.ts` | Carta de Correção API calls |
| `src/services/solicitacao-estorno.ts` | Solicitação de Estorno API calls |
| `src/services/cancelamento-venda.ts` | Cancelamento de Venda API calls |
| `src/components/vinculo-modal.tsx` | Approve/reject modal (Financeiro and TI dashboards) |
| `src/components/troca-pedido-modal.tsx` | Approve/reject modal (Comercial/Faturamento/Financeiro/TI) |
| `src/components/link-pagamento-modal.tsx` | Approve/reject modal (Comercial/Faturamento/Financeiro/TI) |
| `src/components/carta-correcao-modal.tsx` | Approve/reject modal (Comercial/Faturamento/Financeiro/TI) |
| `src/components/solicitacao-estorno-modal.tsx` | Approve/reject modal (Comercial/Faturamento/Financeiro/TI) |
| `src/components/cancelamento-venda-modal.tsx` | Approve/reject modal — no inline edit/resend (see note above) |
| `src/components/novo-pedido-form.tsx` | New order form (Comercial) |
| `src/components/troca-pedido-form.tsx` | New troca de pedido form |
| `src/components/link-pagamento-form.tsx` | New link de pagamento form (CPF/telefone masks) |
| `src/components/carta-correcao-form.tsx` | New carta de correção form |
| `src/components/solicitacao-estorno-form.tsx` | New solicitação de estorno form (CPF mask) |
| `src/components/cancelamento-venda-form.tsx` | New cancelamento de venda form (2 anexo fields, CPF mask) |
| `src/app/(dashboard)/configuracoes/page.tsx` | SMTP + email template settings (admin only) |

## Test Credentials (seed)

| Email | Password | Profile |
|---|---|---|
| admin@vinculo.com | admin123 | admin |
| comercial@vinculo.com | 123456 | comercial |
| faturamento@vinculo.com | 123456 | faturamento |
| financeiro@vinculo.com | 123456 | financeiro |
| ti@vinculo.com | 123456 | ti |
