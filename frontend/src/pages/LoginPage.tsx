import { ParentMark } from "../components/ParentMark";
import { ErrorBanner } from "../components/ui";
import { t } from "../i18n";

/**
 * Sign-in screen. One way in: Google, via Supabase Auth.
 *
 *  - signed out        → the Google button
 *  - checking          → session in hand, waiting on the allowlist check
 *  - blocked           → signed in with an account that isn't authorized
 */
export default function LoginPage({
  onGoogle,
  onSignOut,
  checking,
  blocked,
}: {
  onGoogle: () => void;
  onSignOut: () => void;
  checking: boolean;
  blocked: boolean;
}) {
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

          {blocked && <ErrorBanner error={t.auth.notAuthorized} />}

          <div className="login-fields">
            {blocked ? (
              <button type="button" className="btn btn-primary" onClick={onSignOut}>
                {t.shell.signOut}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onGoogle}
                disabled={checking}
              >
                {checking ? t.auth.checking : t.auth.googleSignIn}
              </button>
            )}
          </div>

          <p className="login-note">{t.auth.note}</p>
        </div>
      </div>
    </div>
  );
}
