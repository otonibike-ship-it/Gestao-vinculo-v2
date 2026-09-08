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

**Most forms use free routing between areas (reworked 2026-08-19), not a fixed pipeline.** Each form has an "area set" — the subset of {comercial, faturamento, financeiro, ti} it actually uses — and at every stage, whoever currently holds the record can **aprovar** (advance — defaults to the next natural step, but for a 3+-area form a `DestinoPicker` lets them redirect to any other area in the set instead) or **reprovar** (send back — `DestinoPicker` covers every other area in the set plus **franquia**). This replaced the 2026-08-04/05 fixed-pipeline rework because a real need surfaced: e.g. TI needs one more piece of info from Comercial, rejects to Comercial, Comercial fills it in and **resends straight back to TI** — not necessarily through Faturamento/Financeiro again.

**2-area forms (Link de Pagamento, Carta de Correção, Solicitação de Estorno) skip the `DestinoPicker` on `aprovar` entirely** — `AprovarXRequest` has no `destino` field, `aprovar` just hardcodes the single possible next step (`if status == first_area: advance to second_area; elif status == second_area: close`), because with only two areas there's nothing to pick between. They still get a `DestinoPicker` on **`reprovar`**, but only from the *second* area (which can send back to the first area or to franquia) — the first area's own reject is hardcoded straight to franquia, no picker, justificativa required, mirroring how Comercial's initial reject worked in the old fixed pipeline. 3+-area forms (Vinculo, Troca de Pedido, Cancelamento de Venda) keep the full picker on both `aprovar` and `reprovar` from every area.

Each form's area set (**bold** = the form's "first area", where franquia submissions land and whose own reject skips the picker) and final area (the one that can additionally choose **"concluir"** on aprovar to close it — `fechado`, only relevant for 3+-area forms since 2-area forms just auto-close from their second area):

| Form | Area set | Final area | Endpoint |
|---|---|---|---|
| Vinculo | **comercial**, financeiro, ti | ti | `vinculo.py` |
| Troca de Pedido | **comercial**, faturamento, ti | ti | `troca_pedido.py` |
| Link de Pagamento | **comercial**, financeiro | financeiro | `link_pagamento.py` |
| Carta de Correção | **faturamento**, financeiro | financeiro | `carta_correcao.py` |
| Solicitação de Estorno | **comercial**, financeiro | financeiro | `solicitacao_estorno.py` |
| Cancelamento de Venda | **comercial**, faturamento, financeiro | financeiro | `cancelamento_venda.py` |

**Carta de Correção is the one form whose first area isn't Comercial** (changed 2026-08-26 — franquia submissions land directly in `aguardando_faturamento`, Comercial never sees them; `criar_carta`'s "novo pedido" email reads `email_faturamento` instead of the `email_comercial` every other form's equivalent function reads). Comercial keeps its "Nova Carta" create button/page (can still submit one on a franquia's behalf), it just isn't part of the approval flow — `podeEditar`/`podeAprovarReprovar` in `carta-correcao-modal.tsx` no longer check `modo === 'comercial'` at all.

Every endpoint follows the same shape: an `_AREA_STATUS` dict (area name → status enum value), `_AREA_EMAIL_CONFIG` (area name → `configuracoes` key for its notification email), `_area_atual()` (reverse lookup from the record's current status), and `_registrar_nota()` (appends `{area, texto, tipo: "aprovacao"|"reprovacao", data}` to the `historico_observacoes` JSON column — every form got this column added in migration `0016`). For 3+-area forms, `aprovar` accepts `destino: Optional[str]` (an area name, or `"concluir"` only from the final area); every form's `reprovar` accepts `destino: Optional[str]` (an area name, or `"franquia"`, which is also the default when omitted). Vinculo is the one 3+-area exception with extra logic: its `necessario_validacao` flag still picks the default next step (financeiro vs ti) when Comercial approves without an explicit destino, preserving the pre-existing skip-financeiro behavior.

On the frontend, every modal renders a `<HistoricoObservacoes historico={record.historico_observacoes} />` (shows the running log, most areas leave a note whether approving or rejecting) and uses the shared `<DestinoPicker options={...} value={...} onChange={...} />` for both the aprovar and reprovar destino choices — options are computed per-modal as "this form's area set minus the current area" (plus franquia for reprovar). `aguardando_ti` remains defined-but-unreachable in `StatusLinkPagamento`/`StatusCartaCorrecao`/`StatusSolicitacaoEstorno`, and `aguardando_financeiro` similarly in `StatusTrocaPedido` — those forms' area sets never route there in practice, but the DB enum can't easily drop values, so they're harmless dead options. The dashboard sections that query those dead statuses (e.g. TI's queue for Link/Carta/Estorno) render as permanently-empty sections — a known cosmetic gap, not a bug.

Pop-up width: all 6 modals use `max-w-3xl` (bumped from `max-w-lg` on 2026-08-19) so the longer forms have room to breathe.

**Every stage of every form can attach files, on both `aprovar` and `reprovar` (added 2026-09-08).** Before this, the *first* area in each form's chain (Comercial, or Faturamento for Carta) only got an "Observação" textarea on approve — no upload — and no `reprovar` endpoint anywhere accepted `anexos` at all. Now: every `Reprovar*Request` schema has `anexos: list[str] = []`, and every `reprovar_*` handler appends them the same way the `aprovar_*` handlers already did (`record.anexos = (record.anexos or []) + payload.anexos`; Cancelamento de Venda's reprovar appends into `anexos_portal_comprovante` instead, matching its aprovar). On the frontend, each modal's single "Anexar documentos (opcional)" upload block (state `arquivosAprovacao`) that used to be gated to `modo !== '<first-area>'` is now unconditional (`podeAprovarReprovar && !mostrarReprovar`) — the first area's `aprovarMutation` branch now uploads too instead of skipping straight to the service call. A second, separate upload block + state (`arquivosReprovacao`) was added inside each modal's `mostrarReprovar` JSX, wired into `reprovarMutation`.

Three things worth knowing before adding a 7th form:
- **Dropdown "motivo" fields** store the full option text as the value (see `frontend/src/components/carta-correcao-selects.tsx` for the two-select pattern), matching `MotivoSelect`/`TrocaMotivoSelect` — not a coded enum.
- **`CancelamentoVenda` has two independent attachment arrays** (`anexos_evidencias_uso`, `anexos_portal_comprovante`) instead of the single `anexos` every other form uses — its `AprovarCancelamentoRequest.anexos` payload merges into `anexos_portal_comprovante` on approve. Its modal also skips the inline "Editar e Reenviar" flow (too many fields split across two attachment types); a reprovado record just tells the franquia to submit a new one. The `/reenviar` endpoint still exists for API consistency but the frontend doesn't call it. **Since 2026-08-25, every field on this form except `franquia_id` and `anexos_portal_comprovante` (at least one file) is optional** — model columns are `nullable=True` (migration `0018`), the create/response schemas wrap every other field in `Optional[...]`, and the frontend's `camposObrigatoriosPreenchidos` only checks franquia + the portal attachment, sending `null` for anything left blank.
- **Free routing is the standard now** (see the area-set table above) — copy an existing endpoint's `_AREA_STATUS`/`_registrar_nota` pattern and an existing modal's `DestinoPicker`/`HistoricoObservacoes` usage rather than building a fixed pipeline from scratch. `MoneyInput` (`frontend/src/components/money-input.tsx`) and `SimNaoSelect` (`frontend/src/components/sim-nao-select.tsx`) are shared components — every currency field across all 6 create-forms/modals uses `MoneyInput` (R$ prefix) and every Sim/Não question uses `SimNaoSelect`.

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

**`/atendimentos-concluidos` (added 2026-08-26)** is a 7th nav item visible to every profile (sidebar entry in `layout/sidebar.tsx` with `perfis` covering all six). It mirrors the Comercial dashboard's layout — same 6 form sections, same table columns — but calls every `.listar()` with `status: 'fechado'` explicitly instead of no filter, and is read-only (`modo="visualizar"` on every modal, no "create new" buttons). Non-franquia profiles see closed records across every franquia; a `franquia` user gets their own `franquia_id` passed through, same as `/franquia` does. Its `useQuery` calls stay `enabled: false` until the profile is read from `authService` — this avoids a real bug class: gating only on "is this a franquia user" (rather than "do we know yet whether this is a franquia user") leaks one unscoped fetch across all franchises before the franquia-scoped refetch replaces it. To keep dashboards from duplicating what's now on this page, `/comercial`'s six list filters and `/franquia`'s six "ativos" filters both now explicitly exclude `status === 'fechado'` (closed records no longer render in either — this was the original complaint: closed and reproved records were cluttering the same list). `/faturamento`, `/financeiro`, `/ti` didn't need this change since they already query one specific in-progress status per form.

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
| `alembic/versions/` | 18 migrations; latest is `0018_cancelamento_venda_campos_opcionais.py` |

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
