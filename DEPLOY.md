# Deploying

The whole app ships as **one Vercel project** from the repo root: the Vite
frontend is built to static files, and the FastAPI backend runs as a single
Python serverless function (`api/index.py`). `vercel.json` wires them together —
`/api/*` is rewritten to the function, everything else to the SPA.

There is nothing to deploy separately. `supabase/` is the database and is set up
once from the Supabase dashboard (see the README's *First-time setup*).

---

## 1. Prerequisites (once)

- The repo is on GitHub (`liorbergman-mafat/project-mgmt`).
- The Supabase schema is applied (`supabase/schema.sql`), with at least one row
  in `allowed_users` — your Google email.
- Google sign-in is enabled in Supabase Auth (README → *Enable Google sign-in*).

---

## 2. Import the project into Vercel

1. Vercel → **Add New** → **Project** → import the repo.
2. **Root Directory:** leave it at the repo root (`.`). `vercel.json` already sets:
   - **Install:** `npm ci --prefix frontend`
   - **Build:** `npm run build --prefix frontend`
   - **Output:** `frontend/dist`
   - the `api/index.py` function, with `backend/app/**` bundled in
   - the `/api/(.*)` → `/api/index` rewrite and the SPA fallback
   - the security headers (CSP, HSTS, …)
3. Vercel reads the root **`requirements.txt`** for the function's Python deps.

---

## 3. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production,
and Preview if you use it).

**Backend function (runtime):**

| Key | Value |
| --- | --- |
| `SUPABASE_URL` | your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | the **`service_role`** key |
| `SUPABASE_ANON_KEY` | the **`anon` (public)** key — used to validate sign-in tokens |
| `FRONTEND_ORIGIN` | `https://<your-vercel-domain>` (add a custom domain here too, comma-separated) |
| `DEBUG` | leave unset, or `false` |

**Frontend (build time — must be set before the build runs):**

| Key | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | the **`anon` (public)** key (safe in the browser) |

Leave `VITE_API_BASE_URL` **unset** — the frontend calls `/api` on its own
origin and the `vercel.json` rewrite routes it to the function. The `VITE_*`
values are read at build time, so after changing one you must redeploy.

---

## 4. Point Supabase Auth at the deployed origin

Once you know the Vercel URL:

- **Google Cloud Console** → OAuth client → **Authorized redirect URI**:
  `https://<project-ref>.supabase.co/auth/v1/callback` (this is the Supabase
  callback, not the Vercel one — it does not change per deploy).
- **Supabase → Authentication → URL Configuration** → add the Vercel origin
  (and any custom domain) to **Redirect URLs**, alongside `http://localhost:5173`.
- Set **Site URL** to the Vercel origin.

---

## 5. Deploy and check

`git push origin main` triggers a deploy (or **Deploy** in the dashboard / `vercel --prod`).

- `https://<domain>/api/health` → `{"status":"ok"}`
- Open the site, sign in with an allowlisted Google account → lands on פרויקטים.
- A non-allowlisted account → "not authorized" screen.
- `/activity` renders the log.

If sign-in fails silently, check the browser console for a CSP `connect-src`
violation — `vercel.json` must allow `https://*.supabase.co` (it does by
default; only relevant if the CSP was edited).

---

## Notes

- `.vercelignore` keeps `backend/.venv`, `smoke_test.py`, `supabase/`, `*.ps1`
  and the local `.env` files out of the upload. `.gitignore` does **not** apply
  to Vercel uploads while `.vercelignore` exists, so every secret path is
  repeated there.
- `requirements.txt` at the repo root mirrors `backend/requirements.txt` minus
  `uvicorn` (the serverless runtime provides the server). Keep them in sync when
  bumping a version.
- The API is not open: every `/api/*` data route rejects a request without a
  valid, allowlisted Supabase token (`backend/app/auth.py`).
