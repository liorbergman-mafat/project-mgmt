import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { api } from "./api";
import { supabase } from "./supabase";

/**
 * Sign-in is Google, through Supabase Auth, and nothing else.
 *
 * Two gates, in order:
 *  1. Supabase authenticates the Google account and issues a session.
 *  2. The backend checks that account's email against the `allowed_users`
 *     table on the first call to `/api/me` and on every call after. An account
 *     that signs in but isn't on the list gets `authorized === false` here and
 *     the "not authorized" screen — it never reaches the app.
 *
 * This module only reads the session and runs check 2; the components above it
 * decide what to render.
 */
export interface SessionUser {
  id: string;
  email: string;
  /** Google display name, falling back to the email if it isn't present. */
  name: string;
  avatarUrl: string | null;
}

/** A non-empty string, or null — for picking through Google's metadata bag. */
function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toUser(session: Session | null): SessionUser | null {
  const user = session?.user;
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const email = user.email ?? "";
  return {
    id: user.id,
    email,
    name: str(meta.full_name) ?? str(meta.name) ?? email,
    avatarUrl: str(meta.avatar_url) ?? str(meta.picture),
  };
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // null = not checked yet, true/false = the backend's answer.
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      setAuthorized(null); // re-check against the allowlist on any change
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setAuthorized(null);
      return;
    }
    let active = true;
    api.auth
      .me()
      .then(() => active && setAuthorized(true))
      .catch(() => active && setAuthorized(false));
    return () => {
      active = false;
    };
  }, [session]);

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { user: toUser(session), loading, authorized, signInWithGoogle, signOut };
}

/** "ליאור ברגמן" → "ל.ב" — the two-letter monogram in the nav bar avatar. */
export function initials(name: string): string {
  const parts = name.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join(".");
}
