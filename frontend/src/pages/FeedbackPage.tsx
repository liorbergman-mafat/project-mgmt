import { useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { api } from "../api";
import { formatRelative, isThisMonth, locationLabel, t, toLocalInputValue } from "../i18n";
import { useShell } from "../shellData";
import { FeedbackIcon } from "../components/icons";
import {
  ConfirmModal,
  EmptyState,
  ErrorBanner,
  Field,
  FilterChips,
  FormActions,
  LOW_RATING,
  Modal,
  Spinner,
  Stars,
  edgeColour,
} from "../components/ui";
import type { Feedback, ProjectSummary } from "../types";

type Filter = "all" | "lowRated" | "thisMonth" | "unrated";

/** Below this the category bar turns amber — the average is a complaint. */
const WEAK_AVERAGE = 3;

function matches(entry: Feedback, filter: Filter): boolean {
  switch (filter) {
    case "lowRated":
      return entry.rating !== null && entry.rating <= LOW_RATING;
    case "thisMonth":
      return isThisMonth(entry.feedback_at);
    case "unrated":
      return entry.rating === null;
    default:
      return true;
  }
}

export default function FeedbackPage() {
  const shell = useShell();
  const { data, error, loading, reload } = shell.feedback;

  const [filter, setFilter] = useState<Filter>("all");
  const [creating, setCreating] = useState(false);

  const all = data ?? [];
  const visible = all.filter((entry) => matches(entry, filter));

  const projectsById = useMemo(
    () => new Map((shell.projects.data ?? []).map((project) => [project.id, project])),
    [shell.projects.data],
  );

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{t.feedback.feedTitle}</h1>
          <p className="subtitle">{t.feedback.feedSubtitle}</p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={() => setCreating(true)}
            disabled={(shell.projects.data ?? []).length === 0}
          >
            + {t.feedback.new}
          </button>
        </div>
      </header>

      {error && <ErrorBanner error={error} onRetry={reload} />}
      {loading && <Spinner />}

      {all.length > 0 && (
        <FilterChips
          selected={filter}
          onSelect={(next) => setFilter(next as Filter)}
          values={[
            { key: "all", label: t.feedback.filters.all },
            { key: "lowRated", label: t.feedback.filters.lowRated },
            { key: "thisMonth", label: t.feedback.filters.thisMonth },
            { key: "unrated", label: t.feedback.filters.unrated },
          ]}
        />
      )}

      {data && all.length === 0 && (
        <EmptyState message={t.feedback.feedEmpty} icon={<FeedbackIcon size={19} />} />
      )}

      {all.length > 0 && (
        <div className="split split-feedback">
          <div className="main-pane feedback-list">
            {visible.length === 0 && (
              <EmptyState message={t.feedback.noMatches} icon={<FeedbackIcon size={19} />} />
            )}
            {visible.map((entry) => (
              <FeedCard
                key={entry.id}
                entry={entry}
                project={projectsById.get(entry.project_id)}
                onChanged={reload}
              />
            ))}
          </div>

          <FeedbackRail entries={all} />
        </div>
      )}

      {creating && (
        <NewFeedbackModal
          projects={shell.projects.data ?? []}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            shell.reloadAll();
          }}
        />
      )}
    </>
  );
}

function FeedCard({
  entry,
  project,
  onChanged,
}: {
  entry: Feedback;
  project: ProjectSummary | undefined;
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    try {
      await api.feedback.remove(entry.id);
      setDeleting(false);
      onChanged();
    } catch (err) {
      setError((err as Error).message);
      setDeleting(false);
    }
  }

  return (
    <article
      className="card feedback-card"
      style={{ "--edge": edgeColour(entry.rating) } as CSSProperties}
    >
      <div className="feedback-head">
        <strong>{locationLabel(entry.location)}</strong>
        <span className="feedback-sep" aria-hidden="true">
          ·
        </span>
        <span className="feedback-project">{project?.name ?? t.common.none}</span>
        <Stars value={entry.rating} />
        <div className="spacer" />
        <time className="when" dateTime={entry.feedback_at}>
          {formatRelative(entry.feedback_at)}
        </time>
      </div>

      <p className="feedback-body">{entry.content}</p>

      <div className="row-actions">
        <button className="link-btn quiet" onClick={() => setDeleting(true)}>
          {t.common.delete}
        </button>
      </div>

      {error && <ErrorBanner error={error} />}

      {deleting && (
        <ConfirmModal
          title={t.common.delete}
          message={t.common.confirmDelete}
          onClose={() => setDeleting(false)}
          onConfirm={remove}
        />
      )}
    </article>
  );
}

/* ------------------------------------------------------------------------
 * Right rail: this month's volume, and how each kind of equipment is scoring.
 * --------------------------------------------------------------------- */

/** Mean rating per equipment category, over the feedback that has both. */
function averagesByCategory(entries: Feedback[]): { name: string; score: number }[] {
  const totals = new Map<string, { sum: number; n: number }>();
  for (const entry of entries) {
    // Only feedback tied to a loan says *which* equipment it is about; the
    // rest is about the unit, and has no category to file it under.
    const name = entry.loan?.item?.type?.name;
    if (!name || entry.rating === null) continue;
    const bucket = totals.get(name) ?? { sum: 0, n: 0 };
    bucket.sum += entry.rating;
    bucket.n += 1;
    totals.set(name, bucket);
  }
  return [...totals]
    .map(([name, { sum, n }]) => ({ name, score: sum / n }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "he"));
}

function FeedbackRail({ entries }: { entries: Feedback[] }) {
  const thisMonth = entries.filter((entry) => isThisMonth(entry.feedback_at));
  const distinctLocations = new Set(thisMonth.map((entry) => entry.location_id)).size;
  const averages = useMemo(() => averagesByCategory(entries), [entries]);

  return (
    <aside className="rail">
      <div className="rail-card dark">
        <div className="label">{t.feedback.monthCount}</div>
        <div className="value num">{thisMonth.length}</div>
        <div className="sub">{t.feedback.monthScope(distinctLocations)}</div>
      </div>

      <div className="rail-card">
        <span className="section-label">{t.feedback.byCategory}</span>
        {averages.length === 0 ? (
          <p className="muted small">{t.feedback.byCategoryEmpty}</p>
        ) : (
          <div className="bars">
            {averages.map((row) => (
              <div key={row.name}>
                <div className="bar-head">
                  <span>{row.name}</span>
                  <span className="score num">{row.score.toFixed(1)}</span>
                </div>
                <div
                  className="bar-track"
                  role="img"
                  aria-label={`${row.name}: ${row.score.toFixed(1)}/5`}
                >
                  <div
                    className={`bar-fill${row.score < WEAK_AVERAGE ? " low" : ""}`}
                    style={{ width: `${(row.score / 5) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------------
 * New feedback, from the cross-project feed — so the project is a field.
 * --------------------------------------------------------------------- */
function NewFeedbackModal({
  projects,
  onClose,
  onCreated,
}: {
  projects: ProjectSummary[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const shell = useShell();
  const [projectId, setProjectId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [rating, setRating] = useState("");
  const [content, setContent] = useState("");
  const [feedbackAt, setFeedbackAt] = useState(toLocalInputValue(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.feedback.create({
        project_id: projectId,
        location_id: locationId,
        rating: rating ? Number(rating) : null,
        content: content.trim(),
        feedback_at: new Date(feedbackAt).toISOString(),
      });
      onCreated();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={t.feedback.new} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-body">
          <Field label={t.units.project} required span>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
              autoFocus
            >
              <option value="">{t.common.none}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.feedback.location} required>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
              <option value="">{t.common.none}</option>
              {(shell.locations.data ?? []).map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {locationLabel(loc)}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.feedback.rating}>
            <select value={rating} onChange={(e) => setRating(e.target.value)}>
              <option value="">{t.feedback.unrated}</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {"★".repeat(n)} ({n})
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.feedback.at} required span>
            <input
              type="datetime-local"
              value={feedbackAt}
              onChange={(e) => setFeedbackAt(e.target.value)}
              required
            />
          </Field>

          <Field label={t.feedback.content} required span>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </Field>

          {error && (
            <div className="span-2">
              <ErrorBanner error={error} />
            </div>
          )}
        </div>

        <FormActions
          saving={saving}
          disabled={!projectId || !locationId || !content.trim()}
          onCancel={onClose}
        />
      </form>
    </Modal>
  );
}
