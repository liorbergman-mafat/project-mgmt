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
  // The server's own message when the /api/me check fails — "not on the
  // allowlist" reads differently from "the backend rejected the token".
  const [authError, setAuthError] = useState<string | null>(null);
  // From /api/me: whether this account may edit the allowlist (הרשאות screen).
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
      })
      .catch(() => {})
      // Whatever happened, stop blocking the first render — a stuck `loading`
      // is a blank page.
      .finally(() => {
        if (active) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      // Supabase fires this for token refreshes and window-focus events too,
      // each with a brand-new Session object for the *same* user. Swapping it
      // into state there would re-run the /api/me check and, mid-flight, drop
      // `authorized` — bouncing the whole shell back through /login and losing
      // the screen you were on. So keep the previous object unless the user
      // actually changed or signed out. API calls always read a fresh token
      // straight from the SDK (see api.ts), so a stale object here is harmless.
      setSession((prev) => {
        if (prev && next && prev.user.id === next.user.id) return prev;
        return next;
      });
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Keyed on the user id, not the Session object: the allowlist check runs once
  // per real sign-in, not on every token refresh.
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      setAuthorized(null);
      setAuthError(null);
      setIsAdmin(false);
      return;
    }
    let active = true;
    api.auth
      .me()
      .then((me) => {
        if (!active) return;
        setAuthorized(true);
        setAuthError(null);
        setIsAdmin(me.is_admin);
        logSessionOnce();
      })
      .catch((err: unknown) => {
        if (!active) return;
        setAuthorized(false);
        setAuthError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return {
    user: toUser(session),
    loading,
    authorized,
    authError,
    isAdmin,
    signInWithGoogle,
    signOut,
  };
}

/**
 * Tell the API to record a "login" activity row, once per browser session —
 * the backend never sees the OAuth round-trip, so this is the only signal it
 * gets that someone signed in. sessionStorage clears when the tab closes, so
 * reopening the app counts as a new login. All of it is best-effort.
 */
function logSessionOnce(): void {
  try {
    if (sessionStorage.getItem("lm.session-logged")) return;
    sessionStorage.setItem("lm.session-logged", "1");
  } catch {
    return; // storage blocked — skip rather than log on every mount
  }
  api.auth.session().catch(() => {});
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
