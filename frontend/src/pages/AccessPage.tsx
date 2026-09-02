import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api";
import { useAsync } from "../hooks";
import { formatDate, t } from "../i18n";
import { useShell } from "../shellData";
import { EditIcon, TrashIcon, UsersIcon } from "../components/icons";
import {
  ConfirmModal,
  EmptyState,
  ErrorBanner,
  Field,
  FormActions,
  Modal,
  Pill,
  Spinner,
} from "../components/ui";
import type { AllowedUser } from "../types";

/* ========================================================================
 * הרשאות — the authorization allowlist. The הרשאות tab of the Settings
 * screen, admins only (the API enforces it too). Sign-in itself is Google;
 * this decides who, once signed in, may use the app.
 * ===================================================================== */
export default function AccessPage() {
  const { user } = useShell();
  const { data, error, loading, reload } = useAsync(() => api.access.list(), []);

  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<AllowedUser | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const list = data ?? [];

  async function toggleAdmin(row: AllowedUser) {
    setActionError(null);
    try {
      await api.access.update(row.email, { is_admin: !row.is_admin });
      reload();
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  async function remove(row: AllowedUser) {
    setActionError(null);
    try {
      await api.access.remove(row.email);
      setRemoving(null);
      reload();
    } catch (err) {
      setActionError((err as Error).message);
      setRemoving(null);
    }
  }

  return (
    <>
      <div className="pane-header">
        <span className="section-label">{t.access.sectionLabel}</span>
        <span className="record-count">{t.common.records(list.length)}</span>
        <div className="spacer" />
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>
          + {t.access.add}
        </button>
      </div>

      {error && <ErrorBanner error={error} onRetry={reload} />}
      {actionError && <ErrorBanner error={actionError} />}
      {loading && <Spinner />}

      {data && list.length === 0 && (
        <EmptyState
          message={t.access.empty}
          icon={<UsersIcon />}
          action={
            <button className="btn btn-secondary btn-sm" onClick={() => setAdding(true)}>
              + {t.access.add}
            </button>
          }
        />
      )}

      {list.length > 0 && (
        <div className="table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t.access.email}</th>
                  <th>{t.access.admin}</th>
                  <th>{t.access.note}</th>
                  <th>{t.access.added}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((row) => {
                  const isSelf = row.email === user.email;
                  return (
                    <tr key={row.email}>
                      <td>
                        <span className="list-row-name">{row.email}</span>
                        {isSelf && <span className="row-tag">{t.access.you}</span>}
                      </td>
                      <td>
                        <Pill tone={row.is_admin ? "teal" : "grey"}>
                          {row.is_admin ? t.access.isAdmin : t.access.member}
                        </Pill>
                      </td>
                      <td className="muted">{row.note || t.common.none}</td>
                      <td className="muted">
                        <time dateTime={row.created_at}>{formatDate(row.created_at)}</time>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-btn"
                            title={row.is_admin ? t.access.revokeAdmin : t.access.makeAdmin}
                            aria-label={`${
                              row.is_admin ? t.access.revokeAdmin : t.access.makeAdmin
                            } — ${row.email}`}
                            onClick={() => toggleAdmin(row)}
                          >
                            <EditIcon />
                          </button>
                          <button
                            className="icon-btn danger"
                            title={t.common.delete}
                            aria-label={`${t.common.delete} — ${row.email}`}
                            onClick={() => setRemoving(row)}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adding && (
        <AddAllowedUserModal
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            reload();
          }}
        />
      )}

      {removing && (
        <ConfirmModal
          title={t.access.removeTitle}
          message={t.access.removeMessage(removing.email)}
          onConfirm={() => remove(removing)}
          onClose={() => setRemoving(null)}
        />
      )}
    </>
  );
}

function AddAllowedUserModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      setError(t.access.invalidEmail);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.access.add({ email: trimmed, is_admin: isAdmin, note: note.trim() || null });
      onAdded();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={t.access.addTitle} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-body">
          <Field label={t.access.email} required span hint={t.access.emailHint}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              disabled={saving}
              autoFocus
              dir="ltr"
            />
          </Field>

          <Field label={t.access.note} span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.access.notePlaceholder}
              disabled={saving}
            />
          </Field>

          <label className="field span-2" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              disabled={saving}
              style={{ width: "auto" }}
            />
            <span className="field-label" style={{ margin: 0 }}>
              {t.access.admin} — {t.access.adminHint}
            </span>
          </label>

          {error && (
            <div className="span-2">
              <ErrorBanner error={error} />
            </div>
          )}
        </div>

        <FormActions saving={saving} onCancel={onClose} />
      </form>
    </Modal>
  );
}
