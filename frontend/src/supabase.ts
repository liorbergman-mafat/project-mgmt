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

if (!url || !anonKey) {
  // Missing here means nobody can ever sign in — make that loud in the console
  // rather than letting it surface as a vague failure at click time.
  console.error(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — sign-in will not work.",
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Parse the "#access_token=..." fragment Google redirects back with.
    detectSessionInUrl: true,
  },
});
