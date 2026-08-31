import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../api";
import { useAsync } from "../hooks";
import { formatDateTime, formatRelative, t } from "../i18n";
import { useShell } from "../shellData";
import { PasswordFormModal, UserFormModal } from "../components/UserFormModal";
import { ActivityIcon, EditIcon, KeyIcon, TrashIcon, UsersIcon } from "../components/icons";
import {
  ConfirmModal,
  EmptyState,
  ErrorBanner,
  FilterChips,
  InfoNote,
  Pill,
  Spinner,
  Tabs,
} from "../components/ui";
import type { Tone } from "../components/ui";
import type { ActivityEntry, User } from "../types";

type Tab = "users" | "activity";

/* ========================================================================
 * Settings — reached from the gear at the foot of the nav bar. Two screens
 * under one header: who may sign in, and what everyone has done.
 * ===================================================================== */
export default function SettingsPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // The tab is the URL, so a settings screen can be linked to and survives a
  // reload — but the two share a header, so they are one component.
  const tab: Tab = pathname.endsWith("/activity") ? "activity" : "users";

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{t.settings.title}</h1>
          <p className="subtitle">{t.settings.subtitle}</p>
        </div>
      </header>

      <Tabs<Tab>
        tabs={[
          { key: "users", label: t.settings.tabs.users },
          { key: "activity", label: t.settings.tabs.activity },
        ]}
        active={tab}
        onSelect={(key) => navigate(`/settings/${key}`)}
      />

      {tab === "users" ? <UsersPanel /> : <ActivityPanel />}
    </>
  );
}

/* ========================================================================
 * Users — add, view, edit, and set a password.
 * ===================================================================== */
function UsersPanel() {
  const { user: signedIn, refresh } = useShell();
  const { data, error, loading, reload } = useAsync(() => api.users.list(), []);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [changingPassword, setChangingPassword] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const users = data ?? [];

  /** A user editing themselves has to see the change in the nav bar too. */
  function afterSaved(saved: User) {
    setCreating(false);
    setEditing(null);
    setChangingPassword(null);
    refresh(saved);
    reload();
  }

  async function remove(target: User) {
    setActionError(null);
    try {
      await api.users.remove(target.id);
      setDeleting(null);
      reload();
    } catch (err) {
      setActionError((err as Error).message);
      setDeleting(null);
    }
  }

  return (
    <>
      <div className="pane-header">
        <span className="section-label">{t.users.title}</span>
        <span className="record-count">{t.common.records(users.length)}</span>
        <div className="spacer" />
        <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
          + {t.users.new}
        </button>
      </div>

      {error && <ErrorBanner error={error} onRetry={reload} />}
      {actionError && <ErrorBanner error={actionError} />}
      {loading && <Spinner />}

      {data && users.length === 0 && (
        <EmptyState
          message={t.users.empty}
          icon={<UsersIcon />}
          action={
            <button className="btn btn-secondary btn-sm" onClick={() => setCreating(true)}>
              + {t.users.new}
            </button>
          }
        />
      )}

      {users.length > 0 && (
        <div className="table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t.users.username}</th>
                  <th>{t.users.fullName}</th>
                  <th>{t.users.role}</th>
                  <th>{t.users.status}</th>
                  <th>{t.users.lastLogin}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="list-row-name">{row.username}</span>
                      {/* Deleting or disabling yourself is allowed, but you
                          should be able to see that it is yourself. */}
                      {row.id === signedIn.id && (
                        <span className="row-tag">{t.users.you}</span>
                      )}
                    </td>
                    <td className="muted">{row.full_name || t.common.none}</td>
                    <td>{t.users.roles[row.role]}</td>
                    <td>
                      <Pill tone={row.is_active ? "green" : "grey"}>
                        {row.is_active ? t.users.active : t.users.disabled}
                      </Pill>
                    </td>
                    <td className="muted">
                      {row.last_login_at ? (
                        <time
                          dateTime={row.last_login_at}
                          title={formatDateTime(row.last_login_at)}
                        >
                          {formatRelative(row.last_login_at)}
                        </time>
                      ) : (
                        t.users.neverLoggedIn
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-btn"
                          title={t.common.edit}
                          aria-label={`${t.common.edit} — ${row.username}`}
                          onClick={() => setEditing(row)}
                        >
                          <EditIcon />
                        </button>
                        <button
                          className="icon-btn"
                          title={t.users.changePassword}
                          aria-label={`${t.users.changePassword} — ${row.username}`}
                          onClick={() => setChangingPassword(row)}
                        >
                          <KeyIcon />
                        </button>
                        <button
                          className="icon-btn danger"
                          title={t.common.delete}
                          aria-label={`${t.common.delete} — ${row.username}`}
                          onClick={() => setDeleting(row)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(creating || editing) && (
        <UserFormModal
          user={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={afterSaved}
        />
      )}

      {changingPassword && (
        <PasswordFormModal
          user={changingPassword}
          onClose={() => setChangingPassword(null)}
          onSaved={afterSaved}
        />
      )}

      {deleting && (
        <ConfirmModal
          title={t.users.deleteConfirmTitle}
          message={t.users.deleteConfirmMessage(deleting.username)}
          onConfirm={() => remove(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}

/* ========================================================================
 * Activity — every recorded change, in Hebrew, with the person who made it.
 * ===================================================================== */

/** The chips above the table. "all" is the off switch, not an action. */
const ALL = "__all__";

/** Colour by how consequential the action is, not by which one it is. */
const ACTION_TONE: Record<string, Tone> = {
  create: "green",
  update: "teal",
  delete: "red",
  archive: "amber",
  unarchive: "teal",
  return: "teal",
  password: "amber",
  login: "grey",
};

/** Hebrew for a recorded key. Anything unrecognised still reads as a word. */
function actionLabel(action: string): string {
  return t.activity.actions[action as keyof typeof t.activity.actions] ?? t.activity.unknownAction;
}

function entityLabel(entity: string): string {
  return (
    t.activity.entities[entity as keyof typeof t.activity.entities] ?? t.activity.unknownEntity
  );
}

function ActivityPanel() {
  const { data, error, loading, reload } = useAsync(() => api.activity.list(), []);
  const [filter, setFilter] = useState<string>(ALL);
  const [query, setQuery] = useState("");

  const entries = useMemo(() => data ?? [], [data]);

  const visible = useMemo(() => {
    const needle = query.trim();
    return entries.filter((entry) => {
      if (filter !== ALL && entry.action !== filter) return false;
      if (!needle) return true;
      // Searches what the reader can actually see: the person, the record,
      // and the Hebrew words in the row — never the stored keys.
      return [entry.actor, entry.label, actionLabel(entry.action), entityLabel(entry.entity)]
        .filter(Boolean)
        .some((field) => (field as string).includes(needle));
    });
  }, [entries, filter, query]);

  const filters = [
    { key: ALL, label: t.activity.filters.all },
    { key: "create", label: t.activity.filters.create },
    { key: "update", label: t.activity.filters.update },
    { key: "delete", label: t.activity.filters.delete },
    { key: "login", label: t.activity.filters.login },
  ];

  return (
    <>
      <div className="pane-header">
        <span className="section-label">{t.activity.title}</span>
        <span className="record-count">{t.common.records(visible.length)}</span>
        <div className="spacer" />
        <input
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.activity.searchPlaceholder}
          aria-label={t.common.search}
        />
      </div>

      {error && <ErrorBanner error={error} onRetry={reload} />}
      {loading && <Spinner />}

      {entries.length > 0 && (
        <FilterChips values={filters} selected={filter} onSelect={setFilter} />
      )}

      {data && entries.length === 0 && (
        <EmptyState message={t.activity.empty} icon={<ActivityIcon />} />
      )}

      {entries.length > 0 && visible.length === 0 && (
        <EmptyState message={t.activity.noMatches} icon={<ActivityIcon />} />
      )}

      {visible.length > 0 && (
        <>
          <div className="table-card">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t.activity.when}</th>
                    <th>{t.activity.actor}</th>
                    <th>{t.activity.action}</th>
                    <th>{t.activity.subject}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((entry) => (
                    <ActivityRow key={entry.id} entry={entry} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <InfoNote>{t.activity.note}</InfoNote>
          </div>
        </>
      )}
    </>
  );
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  // Signing in is not done *to* anything, so it has no subject to name.
  const subject = entry.entity === "auth" ? null : entityLabel(entry.entity);

  return (
    <tr>
      <td className="muted">
        <time dateTime={entry.created_at} title={formatRelative(entry.created_at)}>
          {formatDateTime(entry.created_at)}
        </time>
      </td>
      <td>{entry.actor || t.activity.unknownActor}</td>
      <td>
        <Pill tone={ACTION_TONE[entry.action] ?? "grey"}>{actionLabel(entry.action)}</Pill>
      </td>
      <td>
        {subject ? (
          <>
            <span>{subject}</span>
            {entry.label && <span className="subject-label">{entry.label}</span>}
          </>
        ) : (
          <span className="muted">{t.common.none}</span>
        )}
      </td>
    </tr>
  );
}
