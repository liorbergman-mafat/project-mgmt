import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useAsync } from "../hooks";
import {
  formatDate,
  formatRelative,
  itemLabel,
  locationLabel,
  t,
  toLocalInputValue,
} from "../i18n";
import { useShell } from "../shellData";
import {
  ConfirmModal,
  EmptyState,
  ErrorBanner,
  Field,
  FormActions,
  Modal,
  Pill,
  Spinner,
  Stars,
  Tabs,
} from "../components/ui";
import type { Tone } from "../components/ui";
import type {
  Feedback,
  Item,
  ItemModel,
  ItemStatus,
  ItemType,
  Loan,
  Location,
  ProjectStatus,
} from "../types";

const PROJECT_TONE: Record<ProjectStatus, Tone> = {
  active: "green",
  completed: "blue",
  archived: "grey",
};

/**
 * Item statuses are rows in a table the user edits, not a fixed enum, so the
 * pill colour is keyed off the names the seed data ships with and falls back
 * to grey for anything added later.
 */
const ITEM_STATUS_TONE: Record<string, Tone> = {
  "בשימוש": "green",
  "במחסן": "blue",
  "בתחזוקה": "amber",
  "הושבת": "grey",
};

type Tab = "items" | "loans" | "feedback";

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = projectId!;
  const shell = useShell();
  const navigate = useNavigate();

  const detail = useAsync(() => api.projects.detail(id), [id]);
  // Lookup lists for the "new item" / "new loan" / "new feedback" dropdowns.
  const types = useAsync(() => api.itemTypes.list(), []);
  const models = useAsync(() => api.itemModels.list(), []);
  const statuses = useAsync(() => api.itemStatuses.list(), []);

  const [tab, setTab] = useState<Tab>("items");
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [addingLoan, setAddingLoan] = useState(false);
  const [addingFeedback, setAddingFeedback] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (detail.loading) return <Spinner />;
  if (detail.error) return <ErrorBanner error={detail.error} onRetry={detail.reload} />;
  if (!detail.data) return null;

  const { project, items, loans, feedback } = detail.data;
  const locations = shell.locations.data ?? [];

  /** Anything here can move a project's counts, so the shell reloads with it. */
  function refresh() {
    detail.reload();
    shell.reloadAll();
  }

  async function toggleArchive() {
    if (project.status === "archived") await api.projects.unarchive(project.id);
    else await api.projects.archive(project.id);
    refresh();
  }

  async function deleteProject() {
    await api.projects.remove(project.id);
    shell.reloadAll();
    navigate("/projects");
  }

  const openLoans = loans.filter((loan) => loan.status === "loaned").length;

  return (
    <>
      <Link to="/projects" className="back-link">
        ← {t.common.back} {t.nav.projects}
      </Link>

      <header className="page-header">
        <div>
          <div className="title-row">
            <h1>{project.name}</h1>
            <Pill tone={PROJECT_TONE[project.status]}>
              {t.projects.statusLabels[project.status]}
            </Pill>
          </div>
          {project.description && <p className="subtitle">{project.description}</p>}
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost danger" onClick={() => setDeleting(true)}>
            {t.projects.deleteProject}
          </button>
          <button className="btn btn-ghost" onClick={toggleArchive}>
            {project.status === "archived" ? t.projects.unarchive : t.projects.archive}
          </button>
          <button className="btn btn-secondary" onClick={() => setAddingItem(true)}>
            + {t.projectItems.new}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setAddingLoan(true)}
            disabled={items.length === 0}
          >
            + {t.loans.new}
          </button>
        </div>
      </header>

      <div className="stat-strip">
        <StatCard label={t.projects.stats.items} value={items.length} />
        <StatCard label={t.projects.stats.openLoans} value={openLoans} />
        <StatCard label={t.projects.stats.feedback} value={feedback.length} />
      </div>

      <Tabs
        active={tab}
        onSelect={setTab}
        tabs={[
          { key: "items", label: t.projectItems.title, count: items.length },
          { key: "loans", label: t.loans.title, count: loans.length },
          { key: "feedback", label: t.feedback.title, count: feedback.length },
        ]}
      />

      {tab === "items" &&
        (items.length === 0 ? (
          <EmptyState message={t.projectItems.empty} />
        ) : (
          <ItemsTable items={items} onEdit={setEditingItem} onChanged={refresh} />
        ))}

      {tab === "loans" &&
        (loans.length === 0 ? (
          <EmptyState message={t.loans.empty} />
        ) : (
          <LoansTable loans={loans} onChanged={refresh} />
        ))}

      {tab === "feedback" && (
        <>
          <div className="pane-header">
            <span className="section-label" style={{ margin: 0 }}>
              {t.feedback.title}
            </span>
            <button className="btn btn-secondary" onClick={() => setAddingFeedback(true)}>
              + {t.feedback.new}
            </button>
          </div>
          {feedback.length === 0 ? (
            <EmptyState message={t.feedback.empty} />
          ) : (
            <div className="feedback-list narrow">
              {feedback.map((entry) => (
                <FeedbackCard key={entry.id} entry={entry} onChanged={refresh} />
              ))}
            </div>
          )}
        </>
      )}

      {(addingItem || editingItem) && (
        <ItemFormModal
          projectId={id}
          item={editingItem}
          types={types.data ?? []}
          models={models.data ?? []}
          statuses={statuses.data ?? []}
          locations={locations}
          onClose={() => {
            setAddingItem(false);
            setEditingItem(null);
          }}
          onSaved={() => {
            setAddingItem(false);
            setEditingItem(null);
            refresh();
          }}
        />
      )}

      {addingLoan && (
        <NewLoanModal
          projectId={id}
          items={items}
          locations={locations}
          onClose={() => setAddingLoan(false)}
          onCreated={() => {
            setAddingLoan(false);
            refresh();
          }}
        />
      )}

      {addingFeedback && (
        <NewFeedbackModal
          projectId={id}
          locations={locations}
          loans={loans}
          onClose={() => setAddingFeedback(false)}
          onCreated={() => {
            setAddingFeedback(false);
            refresh();
          }}
        />
      )}

      {deleting && (
        <ConfirmModal
          title={t.projects.deleteConfirmTitle}
          message={t.projects.deleteConfirmMessage(project.name)}
          confirmLabel={t.projects.deleteProject}
          onClose={() => setDeleting(false)}
          onConfirm={deleteProject}
        />
      )}
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value num">{value}</div>
    </div>
  );
}

/* ========================================================================
 * Tab 1 — project items
 * ===================================================================== */
function ItemsTable({
  items,
  onEdit,
  onChanged,
}: {
  items: Item[];
  onEdit: (item: Item) => void;
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    if (!confirm(t.common.confirmDelete)) return;
    setBusyId(id);
    setError(null);
    try {
      await api.items.remove(id);
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      {error && <ErrorBanner error={error} />}
      <div className="table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t.projectItems.typeAndModel}</th>
                <th>{t.projectItems.serialId}</th>
                <th>{t.projectItems.status}</th>
                <th>{t.projectItems.location}</th>
                <th>{t.common.updated}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="strong">{itemLabel(item)}</td>
                  <td className="num" style={{ color: "var(--slate)" }}>
                    {item.serial_id ?? t.common.none}
                  </td>
                  <td>
                    <Pill tone={ITEM_STATUS_TONE[item.status?.name ?? ""] ?? "grey"}>
                      {item.status?.name ?? t.common.none}
                    </Pill>
                  </td>
                  <td>{locationLabel(item.location)}</td>
                  <td className="meta">{formatRelative(item.updated_at)}</td>
                  <td className="actions">
                    <div className="row-actions" style={{ justifyContent: "flex-end" }}>
                      <button className="link-btn" onClick={() => onEdit(item)}>
                        {t.common.edit}
                      </button>
                      <button
                        className="link-btn danger"
                        disabled={busyId === item.id}
                        onClick={() => remove(item.id)}
                      >
                        {t.common.delete}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ========================================================================
 * Tab 2 — loans
 * ===================================================================== */
function LoansTable({ loans, onChanged }: { loans: Loan[]; onChanged: () => void }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(id: string, action: () => Promise<unknown>) {
    setBusyId(id);
    setError(null);
    try {
      await action();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      {error && <ErrorBanner error={error} />}
      <div className="table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t.loans.item}</th>
                <th>{t.loans.location}</th>
                <th>{t.loans.quantity}</th>
                <th>{t.loans.loanedAt}</th>
                <th>{t.loans.status}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <td className="strong">
                    {itemLabel(loan.item)}
                    {loan.item?.serial_id && (
                      <span className="dim num"> · {loan.item.serial_id}</span>
                    )}
                    {loan.notes && <div className="muted small">{loan.notes}</div>}
                  </td>
                  <td>{locationLabel(loan.location)}</td>
                  <td className="num">{loan.quantity}</td>
                  <td className="num" style={{ color: "var(--slate)" }}>
                    {formatDate(loan.loaned_at)}
                    {loan.returned_at && (
                      <div className="dim small num">
                        {t.loans.returnedAt}: {formatDate(loan.returned_at)}
                      </div>
                    )}
                  </td>
                  <td>
                    <LoanStatusPill loan={loan} />
                  </td>
                  <td className="actions">
                    <div className="row-actions" style={{ justifyContent: "flex-end" }}>
                      {loan.status === "loaned" && (
                        <button
                          className="link-btn"
                          disabled={busyId === loan.id}
                          onClick={() => run(loan.id, () => api.loans.markReturned(loan.id))}
                        >
                          {t.loans.markReturned}
                        </button>
                      )}
                      <button
                        className="link-btn quiet"
                        disabled={busyId === loan.id}
                        onClick={() => {
                          if (confirm(t.common.confirmDelete)) {
                            run(loan.id, () => api.loans.remove(loan.id));
                          }
                        }}
                      >
                        {t.common.delete}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function LoanStatusPill({ loan }: { loan: Loan }) {
  const tone: Record<Loan["status"], Tone> = {
    loaned: "blue",
    returned: "grey",
    lost: "red",
  };
  return <Pill tone={tone[loan.status]}>{t.loans.statusLabels[loan.status]}</Pill>;
}

/* ========================================================================
 * Tab 3 — feedback
 * ===================================================================== */
function FeedbackCard({ entry, onChanged }: { entry: Feedback; onChanged: () => void }) {
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
    <article className="card feedback-card">
      <div className="feedback-head">
        <strong>{locationLabel(entry.location)}</strong>
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

/* ========================================================================
 * Modals
 * ===================================================================== */
function ItemFormModal({
  projectId,
  item,
  types,
  models,
  statuses,
  locations,
  onClose,
  onSaved,
}: {
  projectId: string;
  item: Item | null;
  types: ItemType[];
  models: ItemModel[];
  statuses: ItemStatus[];
  locations: Location[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [typeId, setTypeId] = useState(item?.type_id ?? "");
  const [modelId, setModelId] = useState(item?.model_id ?? "");
  const [serialId, setSerialId] = useState(item?.serial_id ?? "");
  const [statusId, setStatusId] = useState(item?.status_id ?? "");
  const [locationId, setLocationId] = useState(item?.location_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const listsEmpty = types.length === 0 || statuses.length === 0 || locations.length === 0;
  const modelsForType = models.filter((m) => m.type_id === typeId);

  function onTypeChange(value: string) {
    setTypeId(value);
    setModelId("");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        project_id: projectId,
        type_id: typeId,
        model_id: modelId,
        serial_id: serialId.trim() || null,
        status_id: statusId,
        location_id: locationId,
      };
      if (item) await api.items.update(item.id, body);
      else await api.items.create(body);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={item ? t.projectItems.edit : t.projectItems.new} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-body">
          {listsEmpty && (
            <div className="span-2">
              <ErrorBanner error={t.projectItems.listsEmpty} />
            </div>
          )}

          <Field label={t.projectItems.type} required>
            <select value={typeId} onChange={(e) => onTypeChange(e.target.value)} required autoFocus>
              <option value="">{t.common.none}</option>
              {types.map((ty) => (
                <option key={ty.id} value={ty.id}>
                  {ty.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.projectItems.model} required>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              required
              disabled={!typeId}
            >
              <option value="">{typeId ? t.common.none : t.projectItems.selectTypeFirst}</option>
              {modelsForType.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.projectItems.serialId} span>
            <input value={serialId} onChange={(e) => setSerialId(e.target.value)} />
          </Field>

          <Field label={t.projectItems.status} required>
            <select value={statusId} onChange={(e) => setStatusId(e.target.value)} required>
              <option value="">{t.common.none}</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.projectItems.location} required>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
              <option value="">{t.common.none}</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {locationLabel(loc)}
                </option>
              ))}
            </select>
          </Field>

          {error && (
            <div className="span-2">
              <ErrorBanner error={error} />
            </div>
          )}
        </div>

        <FormActions
          saving={saving}
          disabled={!typeId || !modelId || !statusId || !locationId}
          onCancel={onClose}
        />
      </form>
    </Modal>
  );
}

function NewLoanModal({
  projectId,
  items,
  locations,
  onClose,
  onCreated,
}: {
  projectId: string;
  items: Item[];
  locations: Location[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [itemId, setItemId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loanedAt, setLoanedAt] = useState(toLocalInputValue(new Date()));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const invalid = !itemId || !locationId || quantity < 1;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.loans.create({
        project_id: projectId,
        item_id: itemId,
        location_id: locationId,
        quantity,
        loaned_at: new Date(loanedAt).toISOString(),
        notes: notes.trim() || null,
      });
      onCreated();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={t.loans.new} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-body">
          {(items.length === 0 || locations.length === 0) && (
            <div className="span-2">
              <ErrorBanner
                error={items.length === 0 ? t.loans.noItems : t.loans.noLocations}
              />
            </div>
          )}

          <Field label={t.loans.item} required span>
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} required autoFocus>
              <option value="">{t.common.none}</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {itemLabel(item)}
                  {item.serial_id ? ` · ${item.serial_id}` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.loans.location} required>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
              <option value="">{t.common.none}</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {locationLabel(loc)}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.loans.quantity} required>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
            />
          </Field>

          <Field label={t.loans.loanedAt} required>
            <input
              type="datetime-local"
              value={loanedAt}
              onChange={(e) => setLoanedAt(e.target.value)}
              required
            />
          </Field>

          <Field label={t.loans.notes} span>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>

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

function NewFeedbackModal({
  projectId,
  locations,
  loans,
  onClose,
  onCreated,
}: {
  projectId: string;
  locations: Location[];
  loans: Loan[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [locationId, setLocationId] = useState("");
  const [loanId, setLoanId] = useState("");
  const [rating, setRating] = useState("");
  const [content, setContent] = useState("");
  const [feedbackAt, setFeedbackAt] = useState(toLocalInputValue(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /**
   * Picking a loan implies which location gave the feedback, so fill it in
   * automatically — the user can still override it afterwards.
   */
  function onLoanChange(value: string) {
    setLoanId(value);
    const loan = loans.find((l) => l.id === value);
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
          <Field label={t.feedback.relatedLoan} span>
            <select value={loanId} onChange={(e) => onLoanChange(e.target.value)} autoFocus>
              <option value="">{t.feedback.generalFeedback}</option>
              {loans.map((loan) => (
                <option key={loan.id} value={loan.id}>
                  {itemLabel(loan.item)} → {locationLabel(loan.location)}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.feedback.location} required>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
              <option value="">{t.common.none}</option>
              {locations.map((loc) => (
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
          disabled={!locationId || !content.trim()}
          onCancel={onClose}
        />
      </form>
    </Modal>
  );
}
