import { useState } from "react";
import type { FormEvent } from "react";
import { Logo } from "../components/Logo";
import { ErrorBanner } from "../components/ui";
import { t } from "../i18n";

/**
 * Placeholder sign-in screen.
 *
 * There is no auth backend yet, so this accepts any non-empty pair and just
 * flips the session flag in `auth.ts` — see the warning there. It exists so
 * the shape of the screen is settled for whenever Supabase Auth is added.
 */
export default function LoginPage({ onSignIn }: { onSignIn: (username: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError(t.auth.missing);
      return;
    }
    onSignIn(username.trim());
  }

  return (
    <div className="login">
      <form className="login-box" onSubmit={submit}>
        {/* The new mark carries no wordmark, so the name is set in text. */}
        <div className="login-brand">
          <Logo size={104} />
          <div className="login-brand-name">{t.appName}</div>
        </div>

        <h1>{t.auth.title}</h1>
        <p className="login-sub">{t.auth.subtitle}</p>

        <label className="field">
          <span className="field-label">{t.auth.username}</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </label>

        <label className="field">
          <span className="field-label">{t.auth.password}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error && <ErrorBanner error={error} />}

        <div className="login-actions">
          <button type="submit" className="btn btn-primary">
            {t.auth.submit}
          </button>
        </div>

        <p className="login-note">{t.auth.note}</p>
      </form>
    </div>
  );
}
