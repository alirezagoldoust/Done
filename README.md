# Done. ✅ — Board-Centric Task Manager

A fast, polished task manager built around a **status × category board**. Each
board renders workflow statuses as rows (TODO, DOING, DONE) and task categories
as columns (Backend, Frontend, …); every cell holds an ordered stack of tasks
you can drag within or across cells. Tasks are created inline, edited in a
modal, and everything is scoped to boards you're a member of.

- **Backend:** Django 5 + Django REST Framework + SQLite (Postgres-ready via
  `DATABASE_URL`), JWT auth (`djangorestframework-simplejwt`).
- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind v4 +
  TanStack Query + dnd-kit + React Hook Form + Zod, on Radix primitives.

> **Port note:** this machine already runs another Django project on **:8000**,
> so this backend uses **:8010**. Change both the `runserver` port and
> `frontend/.env.local` together if you want a different port.

---

## Prerequisites

- Python 3.12+
- Node 20+

## Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env            # optional; sensible defaults work out of the box
python manage.py migrate
python manage.py seed_dev       # demo users, boards, columns, statuses, tasks
python manage.py runserver 8010
```

`seed_dev` creates:

- Users **alice / bob / carol** — password `password123`
- A superuser **admin** — password `admin12345` (for Django Admin)
- Two boards: *Product Launch* (default TODO/DOING/DONE) and *Platform Rebuild*
  (a longer custom workflow), with overlapping members and ~28 tasks.

### Admin & membership

Board membership is managed in **Django Admin** at
`http://127.0.0.1:8010/admin/` (log in as `admin`). Add/remove users on a board
via the **Board** page (inline members, columns, statuses) or the
**Board members** list. A user only sees boards they belong to. When editing a
Task, the assignee list is limited to that board's members.

### Tests

```bash
cd backend
source venv/bin/activate
pytest          # auth, permissions, integrity, and ordering/move coverage
```

## Frontend

```bash
cd frontend
cp .env.example .env.local      # ensure the URL matches your backend port (8010)
npm install
npm run dev                     # http://localhost:3000
```

Sign in with a seeded user (e.g. `alice` / `password123`). New accounts are
created in Django Admin — there is no self-service registration.

### Checks

```bash
cd frontend
npx tsc --noEmit     # type check
npm run lint         # eslint
npm run build        # production build
```

---

## API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/token/` | Obtain JWT access + refresh |
| POST | `/api/auth/token/refresh/` | Refresh the access token |
| GET | `/api/auth/me/` | Current user |
| GET | `/api/boards/` | Boards the user belongs to (+ member/task counts) |
| GET | `/api/boards/:id/` | Full board (columns, statuses, members, tasks) |
| POST | `/api/boards/:id/tasks/` | Quick-create a task (title + column) |
| PATCH / DELETE | `/api/tasks/:id/` | Edit / delete a task |
| POST | `/api/tasks/:id/move/` | Move/reorder a task (atomic) |

Permissions are enforced server-side from `BoardMember` rows — board and task
IDs from the client are never trusted, and cross-board references are rejected.

### Ordering

Tasks carry an integer `position` using a gap strategy (1000, 2000, …). Moves
compute a midpoint between neighbours; when a gap is exhausted the destination
cell is rebalanced inside the move transaction. The backend is authoritative;
the frontend applies an optimistic position and reconciles from the response.

## Architecture notes

- **Backend business logic** lives in services (`boards/services.py`,
  `tasks/services.py`), not in views or signals.
- **Frontend server state** is owned by TanStack Query; mutations
  (create/update/delete/move) update the board cache optimistically and roll
  back with a toast on failure.
- **Auth token storage:** the JWT access token is kept in memory and mirrored to
  `localStorage` (refresh token in `localStorage`) so a reload restores the
  session. This is simple but carries the usual XSS exposure of client-stored
  tokens; for a hardened deployment, switch to httpOnly refresh cookies and keep
  the access token in memory only.

## Not built (intentionally)

Per the MVP scope: no comments, attachments, subtasks, labels, time tracking,
activity feed, automation, or board roles. The models are kept clean so these
can be added later.
