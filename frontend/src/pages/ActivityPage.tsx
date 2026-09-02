import { useMemo, useState } from "react";
import { api } from "../api";
import { useAsync } from "../hooks";
import { formatDateTime, formatRelative, t } from "../i18n";
import { ActivityIcon } from "../components/icons";
import { EmptyState, ErrorBanner, FilterChips, InfoNote, Pill, Spinner } from "../components/ui";
import type { Tone } from "../components/ui";
import type { ActivityEntry } from "../types";

/* ========================================================================
 * Activity — every recorded change, in Hebrew, with the person who made it.
 * The פעולות tab of the Settings screen; any signed-in user may read it.
 * The entries are written by the API middleware, never by a screen.
 * ===================================================================== */

/** The chips above the table. "all" is the off switch, not an action. */
const ALL = "__all__";

/** Colour by how consequential the action is, not by which one it is. */
const ACTION_TONE: Record<string, Tone> = {
  login: "grey",
  create: "green",
  update: "teal",
  delete: "red",
  archive: "amber",
  unarchive: "teal",
  return: "teal",
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

export default function ActivityPage() {
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
    { key: "login", label: t.activity.filters.login },
    { key: "create", label: t.activity.filters.create },
    { key: "update", label: t.activity.filters.update },
    { key: "delete", label: t.activity.filters.delete },
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
