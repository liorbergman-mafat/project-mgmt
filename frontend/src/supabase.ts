import { createClient } from "@supabase/supabase-js";

/**
 * The Supabase client, used only for auth: Google sign-in, the session, and the
 * access token attached to every API call (see api.ts).
 *
 * Both values come from Supabase -> Project Settings -> API and are safe in the
 * browser bundle — the `anon` key grants no data access on its own (RLS denies
 * it, and the backend is what actually talks to the database).
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** False when the build had no Supabase env — App renders a setup message. */
export const supabaseConfigured = Boolean(url && anonKey);

if (!supabaseConfigured) {
  console.error(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — sign-in will not work. " +
      "Set them in frontend/.env (local) or the Vercel project's environment variables, then rebuild.",
  );
}

// `createClient` throws on an empty URL, which would blank the whole page before
// React mounts. Fall back to a syntactically valid placeholder so the app can
// load far enough to show the setup message above.
export const supabase = createClient(
  url || "http://localhost:54321",
  anonKey || "missing-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Parse the "#access_token=..." fragment Google redirects back with.
      detectSessionInUrl: true,
    },
  },
);
