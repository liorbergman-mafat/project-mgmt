import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api";
import { t } from "../i18n";
import { ErrorBanner, Field, FormActions, InfoNote, Modal } from "./ui";
import type { User, UserRole } from "../types";

/** Passwords shorter than this are refused by the API too — see routers/users.py. */
const MIN_PASSWORD = 4;

/**
 * Add or edit a user.
 *
 * Adding asks for a first password; editing does not touch the password at
 * all — a stored password cannot be read back, only replaced, which is what
 * PasswordFormModal below is for.
 */
export function UserFormModal({
  user,
  onClose,
  onSaved,
}: {
  user?: User | null;
  onClose: () => void;
  onSaved: (saved: User) => void;
}) {
  const editing = Boolean(user);

  const [username, setUsername] = useState(user?.username ?? "");
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [role, setRole] = useState<UserRole>(user?.role ?? "user");
  const [isActive, setIsActive] = useState(user?.is_active ?? true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const invalid =
    !username.trim() || (!editing && (password.length < MIN_PASSWORD || password !== confirm));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!editing && password !== confirm) {
      setError(t.users.passwordMismatch);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fields = {
        username: username.trim(),
        full_name: fullName.trim() || null,
        role,
        is_active: isActive,
      };
      const saved = user
        ? await api.users.update(user.id, fields)
        : await api.users.create({ ...fields, password });
      onSaved(saved);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? t.users.edit : t.users.new} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-body">
          <Field label={t.users.username} required>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              autoComplete="off"
            />
          </Field>

          <Field label={t.users.fullName}>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>

          <Field label={t.users.role}>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="user">{t.users.roles.user}</option>
              <option value="admin">{t.users.roles.admin}</option>
            </select>
          </Field>

          <Field label={t.users.status} hint={t.users.activeHint}>
            <select value={isActive ? "1" : "0"} onChange={(e) => setIsActive(e.target.value === "1")}>
              <option value="1">{t.users.active}</option>
              <option value="0">{t.users.disabled}</option>
            </select>
          </Field>

          {/* Only a new user gets a password here — an existing one's is
              replaced from the key button on their row. */}
          {!editing && (
            <>
              <Field label={t.users.password} required hint={t.users.passwordRule}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={MIN_PASSWORD}
                  autoComplete="new-password"
                />
              </Field>

              <Field label={t.users.passwordConfirm} required>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </Field>
            </>
          )}

          <InfoNote>{t.users.roleNote}</InfoNote>

          {error && (
            <div className="span-2">
              <ErrorBanner error={error} />
            </div>
          )}
        </div>

        <FormActions saving={saving} disabled={invalid} onCancel={onClose} />
      </form>
    </Modal>
  );
}

/* -------------------------------------------------------------------------
 * Setting a password. Separate from the form above because the two are not
 * the same job: a stored password cannot be read back and edited, only
 * overwritten, and doing that deserves its own confirmation step.
 * ---------------------------------------------------------------------- */
export function PasswordFormModal({
  user,
  onClose,
  onSaved,
}: {
  user: User;
  onClose: () => void;
  onSaved: (saved: User) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;
  const invalid = password.length < MIN_PASSWORD || password !== confirm;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      onSaved(await api.users.setPassword(user.id, password));
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={t.users.changePasswordFor(user.username)} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-body">
          <Field label={t.users.password} required hint={t.users.passwordRule}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD}
              autoFocus
              autoComplete="new-password"
            />
          </Field>

          <Field label={t.users.passwordConfirm} required>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </Field>

          <InfoNote>{t.users.passwordHint}</InfoNote>

          {(mismatch || error) && (
            <div className="span-2">
              <ErrorBanner error={error ?? t.users.passwordMismatch} />
            </div>
          )}
        </div>

        <FormActions saving={saving} disabled={invalid} onCancel={onClose} />
      </form>
    </Modal>
  );
}
