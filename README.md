# Loan Manager — ניהול השאלות והטמעות

Management app for implementation and equipment loans to military units.
All data is organised by **project**: each project owns its own items (with a
Type/Model/Serial/Status/Location), the loans made from them, and the feedback
each borrowing location gave — with the time it was given.

- **Backend:** Python / FastAPI, talking to Supabase (Postgres)
- **Frontend:** React + TypeScript + Vite, Hebrew RTL interface
- **Auth:** Google sign-in via Supabase Auth, plus a server-side allowlist
  (`allowed_users`) that decides who may actually use the app — see [Security](#security)

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
| `allowed_users`  | Authorization allowlist: one email per person who may use the app. Not tied to a project. |
| `activity_log`   | One row per change made through the API, written by middleware. Read on the פעולות screen. |

---

## First-time setup

### 1. Create the database schema

In the Supabase dashboard → **SQL Editor** → **New query**, paste and run:

1. `supabase/schema.sql` — tables, indexes, triggers, RLS, and the
   `allowed_users` allowlist. Edit the bootstrap `insert` at the bottom of the
   `allowed_users` block (or add rows afterwards) so your own Google email is on
   the list — nobody can get past the login screen otherwise. The script also
   drops the old `users` / `login_attempts` tables from the password era.
2. `supabase/seed.sql` — *optional* demo rows, so the UI isn't empty on first run

`schema.sql` is idempotent, so re-run it after pulling changes that add tables.

### 2. Enable Google sign-in

1. **Google Cloud Console** → create an OAuth 2.0 Client ID (type: *Web
   application*). Authorized redirect URI:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`.
2. **Supabase → Authentication → Providers → Google** → paste the client ID and
   secret, enable it.
3. **Supabase → Authentication → Providers → Email** → **disable** it, and turn
   off **Allow new users to sign up**. Google is meant to be the only way in;
   the allowlist is the second gate, not the first.
4. **Supabase → Authentication → URL Configuration** → add your site URLs
   (`http://localhost:5173` for dev, plus the deployed origin) to **Redirect
   URLs**.

### 3. Configure the backend

```powershell
cd backend
Copy-Item .env.example .env
```

Open `backend/.env` and fill in, from **Supabase → Project Settings → API**:

- `SUPABASE_URL` — your project URL
- `SUPABASE_SERVICE_KEY` — the **`service_role`** key (not `anon`)
- `SUPABASE_ANON_KEY` — the **`anon` (public)** key. Used only to have Supabase
  validate a user's sign-in token; it grants no data access on its own.

`backend/.env` is gitignored. Keep it that way.

### 4. Configure the frontend

```powershell
cd ..\frontend
Copy-Item .env.example .env
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (same values as above — the
anon key is safe in the browser). Leave `VITE_API_BASE_URL` unset for local dev.

### 5. Install dependencies

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

Sign in with **Google**. If the Google account's email isn't in `allowed_users`
you land on a "not authorized" screen instead of the app — add the email in the
Supabase table editor (or `insert into allowed_users (email) values (...)`) and
sign in again. See [Security](#security).

The sidebar on the right holds the screens; your name and the sign-out button
sit at the foot of it, and the bar across the top says where you are.

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
5. **פעולות** — every change anyone has made, in Hebrew: when, who (the Google
   account's email), what kind of action, and which record. Written
   automatically; nothing can edit it. Any signed-in user may read it.

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
read but never modified. It overrides the auth dependency (it tests the data
layer, not sign-in), so it needs no token.

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
| `GET`              | `/api/health`, `/api/me`        | Health check; the signed-in account (`/api/me` needs an allowlisted token) |
| `GET`              | `/api/projects`                 | Projects with loan/feedback counts       |
| `GET`              | `/api/projects/{id}/detail`     | Project + its items + its loans + its feedback, one call |
| `POST`             | `/api/projects/{id}/archive`, `/unarchive` | Move a project in or out of the archive |
| `GET/POST/PATCH/DELETE` | `/api/items`                | Filter list by `project_id`              |
| `GET/POST`         | `/api/loans`                    | Filter by `project_id`, `location_id`, `item_id`, `status` |
| `POST`             | `/api/loans/{id}/return`        | Mark returned, stamped now               |
| `GET/POST`         | `/api/feedback`                 | Filter by `project_id`, `location_id`, `loan_id` |
| `GET/POST/PATCH/DELETE` | `/api/item-types`, `/api/item-models`, `/api/item-statuses`, `/api/locations` | Dropdown option lists, managed from their own screens |
| `GET`              | `/api/activity`                 | The activity log, newest first (`?limit=`) |

---

## Security

**Authentication** is Google, through Supabase Auth. Email/password is disabled;
Google is the only way to obtain a session.

**Authorization** is separate and server-side: `backend/app/auth.py` verifies the
token on every request and checks its email against the `allowed_users` table,
returning 403 if it's absent. Signing in with Google is necessary but not
sufficient — the account also has to be on the list. Manage the list from the
Supabase table editor or with SQL; it's the whole user-management surface. There
are no roles: every allowlisted user can do everything, including read the
activity log.

- Every `/api/*` data route depends on `require_user` (see `main.py`). The only
  unauthenticated endpoint is `/api/health`; `/api/me` still needs a valid,
  allowlisted token to return 200.
- The frontend attaches the Supabase access token to every call (`api.ts`) and
  shows a "not authorized" screen when the allowlist check fails (`auth.ts`).
- The activity log takes the acting identity from that verified token, never
  from a request header, so an entry cannot be forged to name someone else.
- RLS is enabled on every table with **no policies**, so the public `anon` key
  can read nothing directly. The database is only reachable through this API.
- The `service_role` key lives only in `backend/.env` — gitignored, and listed
  in `.vercelignore` so a local `vercel deploy` cannot upload it. (`.gitignore`
  does *not* apply to Vercel uploads while a `.vercelignore` exists.) The `anon`
  key is public by design (it's in the frontend bundle too) and grants no data
  access on its own.
- The interactive docs at `/docs` are off unless `DEBUG=true`.
- `vercel.json` sets CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, and `Permissions-Policy` on every response. The CSP's
  `connect-src` allows `https://*.supabase.co` so the browser can reach Supabase
  Auth.

Still needed before a wider rollout: HTTPS everywhere, and per-user RLS policies
if the database is ever exposed beyond this backend. Don't bind the dev server
to `0.0.0.0`.

---

## Repository

```powershell
git push origin main
```

See `DEPLOY.md` for the Vercel setup.
