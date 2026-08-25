import { useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { api } from "../api";
import { useAsync } from "../hooks";
import { formatRelative, itemLabel, locationLabel, t, toLocalInputValue } from "../i18n";
import { useShell } from "../shellData";
import {
  EmptyState,
  ErrorBanner,
  Field,
  FilterChips,
  FormActions,
  Modal,
  Spinner,
  Stars,
} from "../components/ui";
import type { Feedback, ProjectSummary } from "../types";

type Filter = "all" | "lowRated" | "thisMonth" | "unrated";

/** A rating at or below this reads as a complaint, and colours the card's edge. */
const LOW_RATING = 2;

function isThisMonth(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

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

/** The 3px leading edge encodes the rating at a glance. */
function edgeColour(rating: number | null): string {
  if (rating === null) return "#C3CAD6";
  return rating <= LOW_RATING ? "var(--red)" : "var(--cyan)";
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
        <button
          className="btn btn-primary"
          onClick={() => setCreating(true)}
          disabled={(shell.projects.data ?? []).length === 0}
        >
          + {t.feedback.new}
        </button>
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

      {data && all.length === 0 && <EmptyState message={t.feedback.feedEmpty} />}

      {all.length > 0 && (
        <div className="split split-feedback">
          <div className="feedback-list">
            {visible.length === 0 && <EmptyState message={t.feedback.noMatches} />}
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

  async function remove() {
    if (!confirm(t.common.confirmDelete)) return;
    try {
      await api.feedback.remove(entry.id);
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <article
      className="card feedback-card edged"
      style={{ "--edge": edgeColour(entry.rating) } as CSSProperties}
    >
      <div className="feedback-head">
        <strong>{locationLabel(entry.location)}</strong>
        <span className="feedback-sep" aria-hidden="true">
          ·
        </span>
        <span className="feedback-project">{project?.name ?? t.common.none}</span>
        {entry.loan?.item && <span className="pill pill-item">{itemLabel(entry.loan.item)}</span>}
        <Stars value={entry.rating} />
        <time className="when" dateTime={entry.feedback_at}>
          {formatRelative(entry.feedback_at)}
        </time>
      </div>

      <p className="feedback-body">{entry.content}</p>

      <div className="row-actions">
        <button className="link-btn danger" onClick={remove}>
          {t.common.delete}
        </button>
      </div>

      {error && <ErrorBanner error={error} />}
    </article>
  );
}

/* ------------------------------------------------------------------------
 * Right rail: how each kind of kit is scoring, and this month's volume.
 * --------------------------------------------------------------------- */
function FeedbackRail({ entries }: { entries: Feedback[] }) {
  const averages = useMemo(() => {
    const totals = new Map<string, { sum: number; count: number }>();
    for (const entry of entries) {
      const type = entry.loan?.item?.type?.name;
      if (!type || entry.rating === null) continue;
      const bucket = totals.get(type) ?? { sum: 0, count: 0 };
      bucket.sum += entry.rating;
      bucket.count += 1;
      totals.set(type, bucket);
    }
    return [...totals]
      .map(([label, { sum, count }]) => ({ label, average: sum / count }))
      .sort((a, b) => b.average - a.average);
  }, [entries]);

  const thisMonth = entries.filter((entry) => isThisMonth(entry.feedback_at));
  const distinctLocations = new Set(thisMonth.map((entry) => entry.location_id)).size;

  return (
    <aside className="rail">
      <div className="rail-card">
        <div className="section-label" style={{ marginBottom: 12 }}>
          {t.feedback.averageByType}
        </div>
        {averages.length === 0 ? (
          <p className="muted small">{t.feedback.averageEmpty}</p>
        ) : (
          <div className="bars">
            {averages.map((row) => (
              <div key={row.label}>
                <div className="bar-head">
                  <span>{row.label}</span>
                  <span className="muted num">{row.average.toFixed(1)}</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(row.average / 5) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rail-card dark">
        <div className="label">{t.feedback.monthCount}</div>
        <div className="value num">{thisMonth.length}</div>
        <div className="sub">{t.feedback.monthScope(distinctLocations)}</div>
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
  const [loanId, setLoanId] = useState("");
  const [rating, setRating] = useState("");
  const [content, setContent] = useState("");
  const [feedbackAt, setFeedbackAt] = useState(toLocalInputValue(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Only the chosen project's loans can be attached to its feedback.
  const loans = useAsync(
    () => (projectId ? api.loans.list(projectId) : Promise.resolve([])),
    [projectId],
  );

  function onProjectChange(value: string) {
    setProjectId(value);
    setLoanId("");
  }

  function onLoanChange(value: string) {
    setLoanId(value);
    const loan = (loans.data ?? []).find((l) => l.id === value);
    if (loan) setLocationId(loan.location_id);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.feedback.create({
        project_id: projectId,
        location_id: locationId,
        loan_id: loanId || null,
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
              onChange={(e) => onProjectChange(e.target.value)}
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

          <Field label={t.feedback.relatedLoan} span>
            <select
              value={loanId}
              onChange={(e) => onLoanChange(e.target.value)}
              disabled={!projectId || loans.loading}
            >
              <option value="">{t.feedback.generalFeedback}</option>
              {(loans.data ?? []).map((loan) => (
                <option key={loan.id} value={loan.id}>
                  {itemLabel(loan.item)} → {locationLabel(loan.location)}
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
