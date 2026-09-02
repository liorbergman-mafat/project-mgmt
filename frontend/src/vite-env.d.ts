/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for the backend API, including the /api prefix. Unset in dev. */
  readonly VITE_API_BASE_URL?: string;
  /** Supabase project URL — Supabase → Project Settings → API. */
  readonly VITE_SUPABASE_URL: string;
  /** Supabase `anon` (public) key — safe in the browser bundle. */
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
