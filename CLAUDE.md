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

**All six forms now use free routing between areas (reworked 2026-08-19), not a fixed pipeline.** Each form has an "area set" — the subset of {comercial, faturamento, financeiro, ti} it actually uses — and at every stage, whoever currently holds the record can **aprovar** (advance — defaults to the next natural step, but a `DestinoPicker` lets them redirect to any other area in the set instead) or **reprovar** (send back — `DestinoPicker` covers every other area in the set plus **franquia**). This replaced the 2026-08-04/05 fixed-pipeline rework because a real need surfaced: e.g. TI needs one more piece of info from Comercial, rejects to Comercial, Comercial fills it in and **resends straight back to TI** — not necessarily through Faturamento/Financeiro again. Comercial's own initial reject (from `aguardando_comercial`) still always goes straight to franquia, no picker, justificativa required — that one case didn't need to change.

Each form's area set and final area (the one that can additionally choose **"concluir"** on aprovar to close it — `fechado`):

| Form | Area set | Final area | Endpoint |
|---|---|---|---|
| Vinculo | comercial, financeiro, ti | ti | `vinculo.py` |
| Troca de Pedido | comercial, faturamento, ti | ti | `troca_pedido.py` |
| Link de Pagamento | comercial, financeiro | financeiro | `link_pagamento.py` |
| Carta de Correção | comercial, financeiro | financeiro | `carta_correcao.py` |
| Solicitação de Estorno | comercial, financeiro | financeiro | `solicitacao_estorno.py` |
| Cancelamento de Venda | comercial, faturamento, financeiro | financeiro | `cancelamento_venda.py` |

Every endpoint follows the same shape: an `_AREA_STATUS` dict (area name → status enum value), `_AREA_EMAIL_CONFIG` (area name → `configuracoes` key for its notification email), `_area_atual()` (reverse lookup from the record's current status), and `_registrar_nota()` (appends `{area, texto, tipo: "aprovacao"|"reprovacao", data}` to the `historico_observacoes` JSON column — every form got this column added in migration `0016`). `aprovar` accepts `destino: Optional[str]` (an area name, or `"concluir"` only from the final area); `reprovar` accepts `destino: Optional[str]` (an area name, or `"franquia"`, which is also the default when omitted). Vinculo is the one exception with extra logic: its `necessario_validacao` flag still picks the default next step (financeiro vs ti) when Comercial approves without an explicit destino, preserving the pre-existing skip-financeiro behavior.

On the frontend, every modal renders a `<HistoricoObservacoes historico={record.historico_observacoes} />` (shows the running log, most areas leave a note whether approving or rejecting) and uses the shared `<DestinoPicker options={...} value={...} onChange={...} />` for both the aprovar and reprovar destino choices — options are computed per-modal as "this form's area set minus the current area" (plus franquia for reprovar). `aguardando_ti` remains defined-but-unreachable in `StatusLinkPagamento`/`StatusCartaCorrecao`/`StatusSolicitacaoEstorno`, and `aguardando_financeiro` similarly in `StatusTrocaPedido` — those forms' area sets never route there in practice, but the DB enum can't easily drop values, so they're harmless dead options. The dashboard sections that query those dead statuses (e.g. TI's queue for Link/Carta/Estorno) render as permanently-empty sections — a known cosmetic gap, not a bug.

Pop-up width: all 6 modals use `max-w-3xl` (bumped from `max-w-lg` on 2026-08-19) so the longer forms have room to breathe.

Three things worth knowing before adding a 7th form:
- **Dropdown "motivo" fields** store the full option text as the value (see `frontend/src/components/carta-correcao-selects.tsx` for the two-select pattern), matching `MotivoSelect`/`TrocaMotivoSelect` — not a coded enum.
- **`CancelamentoVenda` has two independent attachment arrays** (`anexos_evidencias_uso`, `anexos_portal_comprovante`) instead of the single `anexos` every other form uses — its `AprovarCancelamentoRequest.anexos` payload merges into `anexos_portal_comprovante` on approve. Its modal also skips the inline "Editar e Reenviar" flow (too many fields split across two attachment types); a reprovado record just tells the franquia to submit a new one. The `/reenviar` endpoint still exists for API consistency but the frontend doesn't call it.
- **Free routing is the standard now** (see the area-set table above) — copy an existing endpoint's `_AREA_STATUS`/`_registrar_nota` pattern and an existing modal's `DestinoPicker`/`HistoricoObservacoes` usage rather than building a fixed pipeline from scratch.

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
| `app/api/v1/endpoints/vinculo.py` | All vinculo CRUD + free-routing approve/reject logic |
| `app/api/v1/endpoints/troca_pedido.py` | All troca de pedido CRUD + free-routing approve/reject logic |
| `app/api/v1/endpoints/link_pagamento.py` | All link de pagamento CRUD + free-routing approve/reject logic (`link_gerado`) |
| `app/api/v1/endpoints/carta_correcao.py` | All carta de correção CRUD + free-routing approve/reject logic |
| `app/api/v1/endpoints/solicitacao_estorno.py` | All solicitação de estorno CRUD + free-routing approve/reject logic |
| `app/api/v1/endpoints/cancelamento_venda.py` | All cancelamento de venda CRUD + free-routing approve/reject logic |
| `app/api/v1/endpoints/configuracoes.py` | SMTP config + email template management |
| `app/services/email.py` | Email sending (creates own DB session) |
| `app/services/auth_service.py` | JWT generation + password validation |
| `app/core/database.py` | Async engine, `get_db` dependency, `AsyncSessionLocal` |
| `alembic/versions/` | 16 migrations; latest is `0016_historico_observacoes.py` |

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
| `src/components/destino-picker.tsx` | Shared button-group used by every modal for the free-routing area choice |
| `src/components/historico-observacoes.tsx` | Shared log display for `historico_observacoes` (+ `AREA_LABELS` map) |
| `src/components/fluxo-stepper.tsx` | Shared "Histórico do Fluxo" progress stepper, used by all 6 modals |
| `src/components/anexos-grid.tsx` | Shared attachment grid (image preview, embedded PDF viewer) used by all 6 modals |
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
