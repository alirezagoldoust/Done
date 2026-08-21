# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Done.** is a board-centric task manager. A board renders as a grid: **statuses** (TODO, DOING, DONE) are rows, **columns/categories** (Backend, Frontend, …) are columns, and every `(status, column)` cell holds an ordered stack of tasks that can be dragged within or across cells. Everything is scoped to boards the user is a member of. There is no self-service registration — users and board membership are managed in Django Admin.

- **backend/** — Django 5 + DRF + SQLite (Postgres-ready via `DATABASE_URL`), JWT auth via `djangorestframework-simplejwt`.
- **frontend/** — Next.js 16 (App Router) + TypeScript + Tailwind v4 + TanStack Query + dnd-kit + React Hook Form + Zod on Radix primitives.

## Port convention

This machine already runs another Django project on **:8000**, so this backend runs on **:8010**. The frontend expects the backend at `http://localhost:8010` (see `frontend/.env.local` / `NEXT_PUBLIC_API_BASE_URL`). If you change the port, change both together. Note: `api-client.ts` falls back to `:8000` only if the env var is unset — in practice the env var is always set to `:8010`.

## Commands

### Backend (run from `backend/`, venv activated)
```bash
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_dev          # demo users (alice/bob/carol, password123), admin/admin12345, 2 boards
python manage.py runserver 8010
pytest                             # full suite
pytest tasks/test_move.py          # single file
pytest tasks/test_move.py::test_name -q   # single test
```
`pytest.ini` sets `DJANGO_SETTINGS_MODULE=config.settings` and collects `tests.py`, `test_*.py`, `*_tests.py`.

### Frontend (run from `frontend/`)
```bash
npm install
npm run dev            # http://localhost:3000
npx tsc --noEmit       # type check
npm run lint           # eslint
npm run build          # production build
```

### Docker
`docker-compose.yml` builds both services; backend host `:8010` → container `:8000`, frontend host `:3010`. `backend/entrypoint.sh` runs `migrate` + `collectstatic` on start. All config comes from git-ignored `.env` files.

## Architecture — the parts that span files

### Access control is derived, never trusted from the client
All authorization flows from `BoardMember` rows. `boards/permissions.py` (`is_member`, `IsBoardMember`) resolves membership from the DB on every request. Both viewsets filter their querysets by membership (`BoardViewSet.get_queryset`, `TaskViewSet.get_queryset`), so board/task IDs supplied by the client can never reach another board's data. Cross-board references (e.g. a neighbour task in the wrong board) are rejected in the service layer. When touching any endpoint, preserve this: filter by membership at the queryset level and validate that related objects belong to the same board.

### Business logic lives in services, not views or signals
`backend/*/services.py` is authoritative for domain rules. Views validate input (serializers), resolve objects, and delegate. Do not put ordering/move logic in views or model signals.

- `tasks/services.py` owns task creation and the **move/ordering** algorithm. Ordering uses an integer `position` **gap strategy** (multiples of `POSITION_GAP = 1000`). New tasks append to the end of their cell. `move_task` (wrapped in `@transaction.atomic`) computes a midpoint between the `before`/`after` neighbours; when the gap collapses it calls `_rebalance` to rewrite the whole cell to clean multiples, then re-reads the moved task. All integrity checks (column/status belong to the task's board; neighbours live in the destination cell) happen here.
- `boards/services.py` — board-level domain logic.

### The move contract (backend ⇄ frontend must stay in sync)
`POST /api/tasks/:id/move/` takes `column_id`, `status_id`, and optional `before_task_id` / `after_task_id`. `before` = the task that ends up immediately *above* (lower position); `after` = immediately *below* (higher position); either null means drop at the start/end of the cell. The **backend is authoritative** and may rebalance. The frontend mirrors the same gap math in `frontend/src/lib/ordering.ts` (`positionBetween`, `GAP = 1000`) purely to render an optimistic move; it then applies the server's returned position and `invalidateQueries` to reconcile any rebalance. If you change `POSITION_GAP` or the neighbour semantics, update both `tasks/services.py` and `lib/ordering.ts`.

### Frontend server state = TanStack Query, with optimistic mutations
The whole board (`columns`, `statuses`, `members`, `tasks`) is fetched via `GET /api/boards/:id/` and cached under one query key (`boardKey(id)` in `use-boards.ts`). All mutations in `hooks/use-tasks.ts` (create/update/delete/move) follow the same pattern: `onMutate` cancels in-flight queries and patches the cached board optimistically (via the shared `patchBoard` helper), `onError` rolls back to `ctx.prev` and shows a `sonner` toast, `onSuccess` replaces the optimistic entry with the authoritative server object. Optimistic created tasks use decrementing negative temp IDs. Keep this contract when adding mutations.

### Auth flow
`hooks/use-auth.tsx` (`AuthProvider` / `useAuth`) owns session state and restores it on load via `fetchMe()`. `lib/api-client.ts` is the single axios instance: it attaches the JWT access token to every request, and on a `401` performs **one** shared refresh (concurrent 401s await the same in-flight `refreshPromise`) then replays the original request; if refresh fails it clears tokens and calls the registered `onSessionExpired` handler, which routes to `/login`. Tokens live in `lib/auth-tokens.ts` — access token in memory + mirrored to `localStorage`, refresh token in `localStorage` (known XSS trade-off, documented in README).

### API error shape
`config/exceptions.py` (`friendly_exception_handler`, wired via `REST_FRAMEWORK.EXCEPTION_HANDLER`) logs unexpected errors server-side and keeps client responses in a consistent envelope; raw tracebacks are never sent to clients. On the frontend, `errorMessage()` in `api-client.ts` extracts a user-friendly string (prefers `detail`, then first field error) for toasts.

## Domain model (`boards/models.py`, `tasks/models.py`)
`Board` → has many `BoardColumn` (categories), `BoardStatus` (workflow states), `BoardMember` (unique per board+user), and `Task`. A `Task` is pinned to one `board` + `column` + `status`, has an optional `doer` (assignee, limited to board members), `deadline`, `color` (enum), and `position`. The index `task_cell_order_idx` on `(board, status, column, position)` backs cell ordering. A `BoardStatus` can be marked `is_collapsible` (an archive-like row members drag done tasks into) with a board-wide persisted `collapsed` state; collapsing it hides that work so the current sprint stays in focus. Archiving is entirely manual — there is no task flag, Sprint entity, or automation; the "archive" is just a collapsable status row.

## API surface
| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/token/` · `/refresh/` | Obtain / refresh JWT |
| GET | `/api/auth/me/` | Current user |
| GET | `/api/boards/` | Boards the user belongs to (+ counts) |
| GET | `/api/boards/:id/` | Full board (columns, statuses, members, tasks) |
| GET/POST | `/api/boards/:id/tasks/` | List / quick-create a task |
| GET/POST | `/api/boards/:id/statuses/` | List / create a status row (custom, optionally collapsable) |
| PATCH/DELETE | `/api/statuses/:id/` | Rename / toggle `is_collapsible` / set `collapsed` / reorder · delete (blocked if the row still holds tasks) |
| PATCH/DELETE | `/api/tasks/:id/` | Edit / delete |
| POST | `/api/tasks/:id/move/` | Move/reorder (atomic) |

## Scope boundaries (intentional MVP omissions)
No comments, attachments, subtasks, labels, time tracking, activity feed, automation, or board roles. Models are kept minimal so these can be added later — see `prd.txt` for full product spec.

## Notes for agents
- `frontend/AGENTS.md` (imported by `frontend/CLAUDE.md`) contains an auto-generated Next.js 16 notice: this Next version has breaking changes vs. older training data — consult `node_modules/next/dist/docs/` before writing Next-specific code. That `<!-- ...nextjs-agent-rules... -->` block is regenerated by `next dev`; commit it with your changes to keep the tree clean.
