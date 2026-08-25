import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { t } from "../i18n";
import { useShell } from "../shellData";
import {
  EmptyState,
  ErrorBanner,
  Field,
  FormActions,
  Modal,
  Pill,
  Segmented,
  Spinner,
} from "../components/ui";
import type { Tone } from "../components/ui";
import type { ProjectStatus, ProjectSummary } from "../types";

/** Statuses a user can pick when creating a project — "archived" is only reached via the archive action. */
const CREATABLE_STATUSES: ProjectStatus[] = ["active", "completed"];

const STATUS_TONE: Record<ProjectStatus, Tone> = {
  active: "green",
  completed: "blue",
  archived: "grey",
};

type Scope = "live" | "archived";

export default function ProjectsPage() {
  const { projects } = useShell();
  const { data, error, loading, reload } = projects;

  const [creating, setCreating] = useState(false);
  const [scope, setScope] = useState<Scope>("live");
  // Set from the overdue banner, to jump straight to what is late.
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const inScope = (data ?? []).filter((project) =>
    scope === "archived" ? project.status === "archived" : project.status !== "archived",
  );
  const overdueLoans = inScope.reduce((sum, project) => sum + project.overdue_count, 0);
  const visible = onlyOverdue ? inScope.filter((project) => project.overdue_count > 0) : inScope;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{t.projects.title}</h1>
          <p className="subtitle">{t.projects.subtitle}</p>
        </div>
        <div className="header-actions">
          <Segmented
            value={scope}
            onChange={setScope}
            options={[
              { key: "live", label: t.projects.hideArchived },
              { key: "archived", label: t.projects.showArchived },
            ]}
          />
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            + {t.projects.new}
          </button>
        </div>
      </header>

      {error && <ErrorBanner error={error} onRetry={reload} />}
      {loading && <Spinner />}

      {overdueLoans > 0 && (
        <div className="alert-banner">
          <span className="alert-dot" aria-hidden="true" />
          <span>{t.projects.overdueBanner(overdueLoans)}</span>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setOnlyOverdue((on) => !on);
            }}
          >
            {onlyOverdue ? t.common.clearFilter : t.projects.overdueBannerAction}
          </a>
        </div>
      )}

      {data && visible.length === 0 && (
        <EmptyState
          message={
            onlyOverdue
              ? t.projects.emptyOverdue
              : scope === "archived"
                ? t.projects.emptyArchived
                : t.projects.empty
          }
        />
      )}

      {visible.length > 0 && (
        <div className="project-grid">
          {visible.map((project) => (
            <ProjectCard key={project.id} project={project} />
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

/** The whole card is the link to the project — there is nothing else to click. */
function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Link to={`/projects/${project.id}`} className="card project-card">
      <div className="project-card-top">
        <h3>{project.name}</h3>
        <Pill tone={STATUS_TONE[project.status]}>{t.projects.statusLabels[project.status]}</Pill>
      </div>

      {project.description && <p className="project-card-desc">{project.description}</p>}

      <div className="project-card-stats">
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
  );
}

function Stat({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div>
      <div className={`value num${alert ? " alert" : ""}`}>{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}

function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
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
      <form onSubmit={submit}>
        <div className="form-body">
          <Field label={t.projects.name} required span>
            <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </Field>

          <Field label={t.projects.status} span>
            <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
              {CREATABLE_STATUSES.map((key) => (
                <option key={key} value={key}>
                  {t.projects.statusLabels[key]}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.projects.description} span>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          {error && (
            <div className="span-2">
              <ErrorBanner error={error} />
            </div>
          )}
        </div>

        <FormActions saving={saving} disabled={!name.trim()} onCancel={onClose} />
      </form>
    </Modal>
  );
}
