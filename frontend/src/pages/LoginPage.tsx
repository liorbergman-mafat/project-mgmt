import { useState } from "react";
import { ParentMark } from "../components/ParentMark";
import { ErrorBanner } from "../components/ui";
import { IDLE_FLAG_KEY } from "../idle";
import { t } from "../i18n";

/** Read (and clear) the "you were logged out for being idle" flag, once. */
function readIdleFlag(): boolean {
  try {
    if (sessionStorage.getItem(IDLE_FLAG_KEY)) {
      sessionStorage.removeItem(IDLE_FLAG_KEY);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Sign-in screen. One way in: Google, via Supabase Auth.
 *
 *  - signed out  → the Google button
 *  - blocked     → signed in with an account that isn't on the allowlist
 */
export default function LoginPage({
  onGoogle,
  onSignOut,
  blocked,
  blockedReason,
}: {
  onGoogle: () => void;
  onSignOut: () => void;
  blocked: boolean;
  /** The server's message when the allowlist check failed, if any. */
  blockedReason?: string | null;
}) {
  const [idleLogout] = useState(readIdleFlag);

  return (
    <div className="login">
      <div className="login-form-pane">
        <div className="login-box">
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

          {blocked ? (
            <ErrorBanner error={blockedReason || t.auth.notAuthorized} />
          ) : (
            idleLogout && <p className="login-note">{t.auth.idleLogout}</p>
          )}

          <div className="login-fields">
            {blocked ? (
              <button type="button" className="btn btn-primary" onClick={onSignOut}>
                {t.shell.signOut}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={onGoogle}>
                {t.auth.googleSignIn}
              </button>
            )}
          </div>

          <p className="login-note">{t.auth.note}</p>
        </div>
      </div>
    </div>
  );
}
