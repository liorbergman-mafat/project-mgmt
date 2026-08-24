import { useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAsync } from "../hooks";
import { t } from "../i18n";
import { Badge, EmptyState, ErrorBanner, Field, Modal, Spinner } from "../components/ui";
import type { ProjectStatus, ProjectSummary } from "../types";

/** Statuses a user can pick when creating a project — "archived" is only reached via the archive action. */
const CREATABLE_STATUSES: ProjectStatus[] = ["active", "completed"];

const STATUS_TONE: Record<ProjectStatus, "green" | "blue" | "grey"> = {
  active: "green",
  completed: "blue",
  archived: "grey",
};

export default function ProjectsPage() {
  const { data, error, loading, reload } = useAsync(() => api.projects.list());
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const visible = (data ?? []).filter((project) =>
    showArchived ? project.status === "archived" : project.status !== "archived",
  );

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{t.projects.title}</h1>
          <p className="muted">{t.projects.subtitle}</p>
        </div>
        <div className="filter-tabs">
          <button
            className={`btn small ${showArchived ? "btn-ghost" : "btn-secondary"}`}
            onClick={() => setShowArchived(false)}
          >
            {t.projects.hideArchived}
          </button>
          <button
            className={`btn small ${showArchived ? "btn-secondary" : "btn-ghost"}`}
            onClick={() => setShowArchived(true)}
          >
            {t.projects.showArchived}
          </button>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          + {t.projects.new}
        </button>
      </header>

      {error && <ErrorBanner error={error} onRetry={reload} />}
      {loading && <Spinner />}
      {data && visible.length === 0 && (
        <EmptyState message={showArchived ? t.projects.emptyArchived : t.projects.empty} />
      )}

      {visible.length > 0 && (
        <div className="card-grid">
          {visible.map((project) => (
            <ProjectCard key={project.id} project={project} onChanged={reload} />
          ))}
        </div>
      )}

      {creating && (
        <NewProjectModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            reload();
          }}
        />
      )}
    </>
  );
}

function ProjectCard({
  project,
  onChanged,
}: {
  project: ProjectSummary;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function toggleArchive(e: MouseEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (project.status === "archived") {
        await api.projects.unarchive(project.id);
      } else {
        await api.projects.archive(project.id);
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card project-card">
      <Link to={`/projects/${project.id}`} className="project-card-link">
        <div className="card-top">
          <h3>{project.name}</h3>
          <Badge tone={STATUS_TONE[project.status]}>
            {t.projects.statusLabels[project.status]}
          </Badge>
        </div>

        {project.description && <p className="card-desc">{project.description}</p>}

        <div className="stat-row">
          <Stat label={t.projects.stats.loans} value={project.loan_count} />
          <Stat label={t.projects.stats.open} value={project.open_loan_count} />
          <Stat
            label={t.projects.stats.overdue}
            value={project.overdue_count}
            alert={project.overdue_count > 0}
          />
          <Stat label={t.projects.stats.feedback} value={project.feedback_count} />
        </div>
      </Link>

      <div className="card-foot">
        <button className="btn btn-ghost small" disabled={busy} onClick={toggleArchive}>
          {project.status === "archived" ? t.projects.unarchive : t.projects.archive}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="stat">
      <span className={`stat-value ${alert ? "stat-alert" : ""}`}>{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function NewProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.projects.create({
        name: name.trim(),
        description: description.trim() || null,
        status,
      });
      onCreated();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={t.projects.new} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <Field label={t.projects.name} required>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>

        <Field label={t.projects.description}>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <Field label={t.projects.status}>
          <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
            {CREATABLE_STATUSES.map((key) => (
              <option key={key} value={key}>
                {t.projects.statusLabels[key]}
              </option>
            ))}
          </select>
        </Field>

        {error && <ErrorBanner error={error} />}

        <footer className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t.common.cancel}
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
            {saving ? t.common.loading : t.common.save}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
