import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api";
import type { SessionUser } from "../auth";
import { ParentMark } from "../components/ParentMark";
import { ErrorBanner } from "../components/ui";
import { t } from "../i18n";

/**
 * Sign-in.
 *
 * The pair goes to the API, which checks it against the `users` table —
 * managed from Settings → משתמשים — and answers with the user record the
 * session is built from. The server deliberately gives one message for a
 * wrong username and a wrong password alike; this screen just shows it.
 *
 * It gates the UI, not the data: see the note in auth.ts.
 */
export default function LoginPage({ onSignIn }: { onSignIn: (user: SessionUser) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError(t.auth.missing);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onSignIn(await api.auth.login(username.trim(), password));
    } catch (err) {
      setError((err as Error).message);
      setPassword("");
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login-form-pane">
        <form className="login-box" onSubmit={submit}>
          <div className="login-brand">
            {/* Mark and unit name are one lockup — they always move together. */}
            <div className="login-lockup">
              <ParentMark className="login-brand-mark" />
              <div className="login-brand-unit">AI &amp; Autonomy</div>
            </div>
            <div className="login-brand-name">{t.appName}</div>
            <div className="login-brand-sub">{t.auth.title}</div>
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
                disabled={busy}
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
                disabled={busy}
              />
            </label>

            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? t.common.loading : t.auth.submit}
            </button>
          </div>

          <p className="login-note">{t.auth.note}</p>
        </form>
      </div>
    </div>
  );
}
