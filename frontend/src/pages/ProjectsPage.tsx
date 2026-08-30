import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { formatRelative, isThisMonth, t } from "../i18n";
import { useShell } from "../shellData";
import { ProjectsIcon } from "../components/icons";
import {
  ConfirmModal,
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
  completed: "teal",
  archived: "grey",
};

type Scope = "live" | "archived";

export default function ProjectsPage() {
  const shell = useShell();
  const { projects } = shell;
  const { data, error, loading, reload } = projects;

  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<ProjectSummary | null>(null);
  const [scope, setScope] = useState<Scope>("live");

  const all = data ?? [];
  const visible = all.filter((project) =>
    scope === "archived" ? project.status === "archived" : project.status !== "archived",
  );

  // How much equipment each project carries. The projects endpoint counts
  // loans and feedback but not items, so that one column is folded from the
  // items list the shell already holds — no new endpoint.
  const itemsByProject = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of shell.items.data ?? []) {
      counts.set(item.project_id, (counts.get(item.project_id) ?? 0) + 1);
    }
    return counts;
  }, [shell.items.data]);

  const live = all.filter((project) => project.status !== "archived");
  const summary = {
    projects: live.length,
    items: (shell.items.data ?? []).length,
    openLoans: live.reduce((n, project) => n + project.open_loan_count, 0),
    feedback: (shell.feedback.data ?? []).filter((entry) => isThisMonth(entry.feedback_at)).length,
  };

  const emptyMessage = scope === "archived" ? t.projects.emptyArchived : t.projects.empty;
  const emptyHint = scope === "archived" ? t.projects.emptyArchivedHint : t.projects.emptyHint;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{t.projects.title}</h1>
          <p className="subtitle">{t.projects.subtitle}</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            + {t.projects.new}
          </button>
        </div>
      </header>

      <div className="stat-strip">
        <Tile label={t.projects.summary.active} value={summary.projects} />
        <Tile label={t.projects.summary.items} value={summary.items} />
        <Tile label={t.projects.summary.openLoans} value={summary.openLoans} teal />
        <Tile label={t.projects.summary.monthFeedback} value={summary.feedback} />
      </div>

      {/* Scope is a filter, not a page action: it belongs with the other
          sub-navigation under the header, not beside the primary button. */}
      <div className="filter-row">
        <Segmented
          value={scope}
          onChange={setScope}
          options={[
            { key: "live", label: t.projects.hideArchived },
            { key: "archived", label: t.projects.showArchived },
          ]}
        />
        <div className="spacer" />
        <span className="record-count num">{t.common.records(visible.length)}</span>
      </div>

      {error && <ErrorBanner error={error} onRetry={reload} />}
      {loading && <Spinner />}

      {data && visible.length === 0 && (
        <EmptyState
          message={emptyMessage}
          hint={emptyHint}
          icon={<ProjectsIcon size={19} />}
          action={
            scope === "live" && (
              <button className="btn btn-secondary btn-sm" onClick={() => setCreating(true)}>
                + {t.projects.new}
              </button>
            )
          }
        />
      )}

      {visible.length > 0 && (
        <div className="table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t.projects.name}</th>
                  <th>{t.projects.status}</th>
                  <th>{t.projects.columns.items}</th>
                  <th>{t.projects.columns.loans}</th>
                  <th>{t.projects.columns.open}</th>
                  <th>{t.projects.columns.feedback}</th>
                  <th>{t.common.updated}</th>
                  <th className="shrink" />
                </tr>
              </thead>
              <tbody>
                {visible.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    itemCount={itemsByProject.get(project.id) ?? 0}
                    onDelete={() => setDeleting(project)}
                  />
                ))}
              </tbody>
            </table>
          </div>
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

      {deleting && (
        <ConfirmModal
          title={t.projects.deleteConfirmTitle}
          message={t.projects.deleteConfirmMessage(deleting.name)}
          confirmLabel={t.projects.deleteProject}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await api.projects.remove(deleting.id);
            setDeleting(null);
            shell.reloadAll();
          }}
        />
      )}
    </>
  );
}

function Tile({ label, value, teal }: { label: string; value: number; teal?: boolean }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className={`value num${teal ? " teal" : ""}`}>{value}</div>
    </div>
  );
}

function ProjectRow({
  project,
  itemCount,
  onDelete,
}: {
  project: ProjectSummary;
  itemCount: number;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  const open = () => navigate(`/projects/${project.id}`);

  return (
    <tr>
      <td>
        <button className="link-btn project-name" onClick={open}>
          {project.name}
        </button>
        {project.description && <div className="sub">{project.description}</div>}
      </td>
      <td>
        <Pill tone={STATUS_TONE[project.status]}>{t.projects.statusLabels[project.status]}</Pill>
      </td>
      <td className="num">{itemCount}</td>
      <td className="num">{project.loan_count}</td>
      {/* The one number worth chasing gets the brand colour — but only when
          there is actually something open. */}
      <td className={`num strong${project.open_loan_count > 0 ? " teal" : " dim"}`}>
        {project.open_loan_count}
      </td>
      <td className="num">{project.feedback_count}</td>
      <td className="meta">{formatRelative(project.updated_at)}</td>
      <td className="actions">
        <div className="row-actions">
          <button className="link-btn" onClick={open}>
            {t.common.open}
          </button>
          <button className="link-btn danger" onClick={onDelete}>
            {t.common.delete}
          </button>
        </div>
      </td>
    </tr>
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
