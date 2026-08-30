import { useState } from "react";
import type { FormEvent } from "react";
import { verify } from "../auth";
import { Logo } from "../components/Logo";
import { ErrorBanner } from "../components/ui";
import { t } from "../i18n";

/**
 * Placeholder sign-in screen.
 *
 * There is no auth backend yet: the pair is checked against the short list in
 * `auth.ts`, which runs entirely in the browser — see the warning there. It
 * exists so the shape of the screen is settled for whenever Supabase Auth is
 * added.
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
    const authorized = verify(username, password);
    if (!authorized) {
      // Deliberately one message for both halves — naming which one was wrong
      // tells a stranger which usernames exist.
      setError(t.auth.invalid);
      setPassword("");
      return;
    }
    onSignIn(authorized);
  }

  return (
    <div className="login">
      <div className="login-form-pane">
        <form className="login-box" onSubmit={submit}>
          {/* The mark carries no wordmark, so the name is set in text. */}
          <div className="login-brand">
            <Logo />
            <div>
              <div className="login-brand-name">{t.appName}</div>
              <div className="login-brand-sub">{t.auth.title}</div>
            </div>
          </div>

          <p className="login-sub">{t.auth.subtitle}</p>

          {error && <ErrorBanner error={error} />}

          <div className="login-fields">
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

            <button type="submit" className="btn btn-primary">
              {t.auth.submit}
            </button>
          </div>

          <p className="login-note">{t.auth.note}</p>
        </form>
      </div>

      {/* Two radial washes behind the mark — the teal and oxblood halves of
          the shield, thrown onto the panel behind it. */}
      <div className="login-art" aria-hidden="true">
        <Logo />
      </div>
    </div>
  );
}
