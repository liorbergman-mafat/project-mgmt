# Loan Manager — ניהול השאלות והטמעות

Management app for implementation and equipment loans to military units.
All data is organised by **project**: each project owns its own items (with a
Type/Model/Serial/Status/Location), the loans made from them, and the feedback
each borrowing location gave — with the time it was given.

- **Backend:** Python / FastAPI, talking to Supabase (Postgres)
- **Frontend:** React + TypeScript + Vite, Hebrew RTL interface
- **Auth:** a real user list with hashed passwords, but no API session yet — see
  [Security](#security) before putting this on a network

---

## Data model

```
item_types ─< item_models

projects ──┬─< items >── type_id / model_id / status_id / location_id
           │
           ├─< loans >── item_id, location_id
           │
           └─< feedback >── location_id
                   │
                   └─ loan_id (nullable: feedback on one loan, or on the project)
```

| Table            | What it holds                                                              |
| ---------------- | --------------------------------------------------------------------------- |
| `projects`       | Top-level grouping. Everything else hangs off a project.                    |
| `item_types`     | The Type dropdown's options (e.g. קשר, מחשוב). Managed from Settings → ציוד. |
| `item_models`    | The Model dropdown's options, each tied to one type. Managed from Settings → ציוד, nested under their type. |
| `item_statuses`  | The Status dropdown's options (e.g. בשימוש, במחסן). Managed from Settings.  |
| `locations`      | Everywhere an item can be — a borrowing unit or a warehouse. Created and edited from Settings only. |
| `items`          | One row per physical item, owned by exactly one project. Type/Model/Status/Location + a free-text serial. |
| `loans`          | "Item X was loaned to location Y under project Z", with dates + status — separate from the item's own status/location. |
| `feedback`       | What a location said, when they said it, optionally about one loan.         |
| `users`          | Who may sign in. Stores only a password hash; managed from Settings → משתמשים. |
| `activity_log`   | One row per change made through the API, written by middleware. Read on Settings → פעולות. |

---

## First-time setup

### 1. Create the database schema

In the Supabase dashboard → **SQL Editor** → **New query**, paste and run:

1. `supabase/schema.sql` — tables, indexes, triggers, RLS
2. `supabase/seed.sql` — *optional* demo rows, so the UI isn't empty on first run

`schema.sql` is idempotent, so re-run it after pulling changes that add tables —
`users` and `activity_log` came in that way. The first sign-in on an empty
`users` table creates two admin accounts (see `backend/app/routers/users.py`);
change their passwords from Settings → משתמשים straight after.

### 2. Configure the backend

```powershell
cd backend
Copy-Item .env.example .env
```

Open `backend/.env` and fill in, from **Supabase → Project Settings → API**:

- `SUPABASE_URL` — your project URL
- `SUPABASE_SERVICE_KEY` — the **`service_role`** key (not `anon`)

`backend/.env` is gitignored. Keep it that way.

### 3. Install dependencies

Already done once, but to reproduce on another machine:

```powershell
# Backend
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# Frontend
cd ..\frontend
npm install
```

---

## Running it

Two terminals, both from the repo root.

**Terminal 1 — API** (http://127.0.0.1:8000, docs at `/docs`):

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

**Terminal 2 — UI** (http://localhost:5173):

```powershell
cd frontend
npm run dev
```

Then open **http://localhost:5173**. Vite proxies `/api` to the backend, so the
browser only ever talks to one origin.

> Or just run `.\run-dev.ps1` from the repo root to start both at once.

---

## Using it

Sign in with a username and password from the `users` table — see
[Security](#security) for what that does and does not protect.

The sidebar on the right holds the four screens; your name, a gear for
**הגדרות**, and the sign-out button sit at the foot of it, and the bar across
the top says where you are. Settings has two tabs:

- **משתמשים** — add, view and edit the people who may sign in, and set anyone's
  password. A disabled user stays on the list but is refused at sign-in.
- **פעולות** — every change anyone has made, in Hebrew: when, who, what kind of
  action, and which record. Written automatically; nothing can edit it.

1. **הגדרות** — set up the dropdown option lists once, across three tabs:
   - **ציוד** — the catalogue: every Type, with its Models nested under it.
     Expand a type to see, add, edit or delete its models.
   - **סטטוסים** — the Status options.
   - **מיקומים** — units, warehouses, anywhere an item can be. This is the
     **only** place a location can be created or edited; the מיקומים screen in
     the sidebar is a read-only directory.
2. **פרויקטים** — the landing screen: four summary tiles over a table with one
   row per project — its item, loan, open-loan and feedback counts, and when it
   last changed. **פעילים / בארכיון** switches which set you are looking at.
   Open a project for three tabs:
   - **פריטי הפרויקט** — **+ פריט חדש** adds an item to *this* project
     (Type/Model/Serial/Status/Location); rows can be edited or deleted.
   - **השאלות** — **+ השאלה חדשה** records one of the project's items loaned to
     a location.
   - **משוב** — **+ משוב חדש** records what a location said, and when.
3. **מיקומים** — the directory: every unit and warehouse, bucketed by brigade.
   The buckets open shut — 243 units across 71 brigades is a wall of rows — and
   each one still carries its totals while collapsed. Expand one and select a
   row to open a panel with its contact, its stock by type and model, and its
   latest feedback.
4. **משוב מהיחידות** — every project's feedback in one feed, filterable by low
   ratings, this month, or unrated, with this month's volume and the average
   rating per equipment category in the rail beside it.

**סמן כהוחזר** closes a loan and stamps the return time.

The per-location counts on **מיקומים** are folded together in the browser from
the items, loans and feedback lists (`frontend/src/locationStats.ts`), because
`GET /api/locations` returns location rows only. If those lists outgrow a single
fetch, that is the piece to move behind an aggregate endpoint.

---

## Testing

`backend/smoke_test.py` exercises the whole API against your real Supabase
project — create a project, loan an item, log feedback, mark it returned, check
the foreign-key guards — then deletes everything it created. Existing rows are
read but never modified.

```powershell
cd backend
.\.venv\Scripts\python.exe smoke_test.py
```

Run it after any schema or router change. It exits non-zero on failure.

---

## API

Interactive docs at http://127.0.0.1:8000/docs.

| Method             | Path                            | Purpose                                  |
| ------------------ | ------------------------------- | ---------------------------------------- |
| `GET`              | `/api/projects`                 | Projects with loan/feedback counts       |
| `GET`              | `/api/projects/{id}/detail`     | Project + its items + its loans + its feedback, one call |
| `POST`             | `/api/projects/{id}/archive`, `/unarchive` | Move a project in or out of the archive |
| `GET/POST/PATCH/DELETE` | `/api/items`                | Filter list by `project_id`              |
| `GET/POST`         | `/api/loans`                    | Filter by `project_id`, `location_id`, `item_id`, `status` |
| `POST`             | `/api/loans/{id}/return`        | Mark returned, stamped now               |
| `GET/POST`         | `/api/feedback`                 | Filter by `project_id`, `location_id`, `loan_id` |
| `GET/POST/PATCH/DELETE` | `/api/item-types`, `/api/item-models`, `/api/item-statuses`, `/api/locations` | Dropdown option lists, managed from their own screens |
| `POST`             | `/api/auth/login`               | Check a username/password pair; returns the user |
| `GET/POST/PATCH/DELETE` | `/api/users`               | Who may sign in. Never returns a password hash |
| `POST`             | `/api/users/{id}/password`      | Set a password outright                  |
| `GET`              | `/api/activity`                 | The activity log, newest first (`?limit=`) |

---

## Security

**Every endpoint requires a valid session token.** `POST /api/auth/login` is
the only route that answers without one — it checks the pair against the
`users` table, which stores a PBKDF2-SHA256 hash (`backend/app/security.py`),
and returns a signed bearer token (`backend/app/tokens.py`) that every later
request carries in an `Authorization` header.

How it is enforced:

- `current_user` (`backend/app/deps.py`) hangs off every router. It verifies
  the token's HMAC signature and expiry, then **re-reads the user from the
  database** — so disabling or deleting an account ends its open sessions on
  the next request rather than whenever the token expires.
- `role` is a real permission. Managing users and reading the activity log
  require `admin` (`require_admin`); changing a password is either an
  administrator resetting someone else's or a user changing their own with the
  current one in hand.
- Sign-in is rate limited: eight failures for one username inside fifteen
  minutes are refused with a 429 until the window slides past.
- The activity log takes the acting username from the signed token, never from
  a request header, so an entry cannot be forged to name someone else.
- Tokens live twelve hours. Rotating `SESSION_SECRET` invalidates every open
  session at once.

Also in place:

- RLS is enabled on every table with **no policies**, so the public `anon` key
  can read nothing. The database is only reachable through this API.
- The `service_role` key lives only in `backend/.env` — gitignored, and listed
  in `.vercelignore` so a local `vercel deploy` cannot upload it. (`.gitignore`
  does *not* apply to Vercel uploads while a `.vercelignore` exists.)
- No account is seeded automatically. Set `BOOTSTRAP_USERNAME` and
  `BOOTSTRAP_PASSWORD` for the first sign-in on an empty table, then unset them.
- Passwords are 12–128 characters, hashed, never stored or returned in plaintext.
- The interactive docs at `/docs` are off unless `DEBUG=true`.
- `vercel.json` sets CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, and `Permissions-Policy` on every response.

Still worth knowing: the session token is held in `sessionStorage`, so it is
reachable from JavaScript. There is no XSS sink in the app today, which makes
that an acceptable trade; an `HttpOnly` cookie is stronger and costs a CSRF
token on writes. And there is no per-user data partition — this is a
single-tenant tool where all signed-in staff see all records by design.

---

## Repository

Git is initialised locally with a `main` branch. Nothing is pushed — add your
remote and push branches yourself when you're ready:

```powershell
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```
