import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useAsync } from "../hooks";
import {
  formatDate,
  formatDateTime,
  formatRelative,
  itemLabel,
  locationLabel,
  t,
  toLocalInputValue,
} from "../i18n";
import {
  Badge,
  EmptyState,
  ErrorBanner,
  Field,
  Modal,
  Rating,
  Spinner,
} from "../components/ui";
import type {
  Feedback,
  Item,
  ItemModel,
  ItemStatus,
  ItemType,
  Loan,
  LoanStatus,
  Location,
  ProjectStatus,
} from "../types";

const PROJECT_TONE: Record<ProjectStatus, "green" | "blue" | "grey"> = {
  active: "green",
  completed: "blue",
  archived: "grey",
};

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = projectId!;

  const detail = useAsync(() => api.projects.detail(id), [id]);
  // Lookup lists for the "new item" / "new loan" / "new feedback" dropdowns.
  const types = useAsync(() => api.itemTypes.list(), []);
  const models = useAsync(() => api.itemModels.list(), []);
  const statuses = useAsync(() => api.itemStatuses.list(), []);
  const locations = useAsync(() => api.locations.list(), []);

  const [addingItem, setAddingItem] = useState(false);
  const [addingLoan, setAddingLoan] = useState(false);
  const [addingFeedback, setAddingFeedback] = useState(false);

  if (detail.loading) return <Spinner />;
  if (detail.error) return <ErrorBanner error={detail.error} onRetry={detail.reload} />;
  if (!detail.data) return null;

  const { project, items, loans, feedback } = detail.data;

  async function toggleArchive() {
    if (project.status === "archived") {
      await api.projects.unarchive(project.id);
    } else {
      await api.projects.archive(project.id);
    }
    detail.reload();
  }

  return (
    <>
      <Link to="/projects" className="back-link">
        ← {t.common.back} {t.nav.projects}
      </Link>

      <header className="page-header">
        <div>
          <div className="title-row">
            <h1>{project.name}</h1>
            <Badge tone={PROJECT_TONE[project.status]}>
              {t.projects.statusLabels[project.status]}
            </Badge>
          </div>
          {project.description && <p className="muted">{project.description}</p>}
        </div>
        <button className="btn btn-ghost" onClick={toggleArchive}>
          {project.status === "archived" ? t.projects.unarchive : t.projects.archive}
        </button>
      </header>

      {/* ---------------------------------------------------------------- */}
      <section className="section">
        <div className="section-header">
          <h2>
            {t.projectItems.title} <span className="count">{items.length}</span>
          </h2>
          <button className="btn btn-primary" onClick={() => setAddingItem(true)}>
            + {t.projectItems.new}
          </button>
        </div>

        {items.length === 0 ? (
          <EmptyState message={t.projectItems.empty} />
        ) : (
          <ItemsTable items={items} onChanged={detail.reload} />
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="section">
        <div className="section-header">
          <h2>
            {t.loans.title} <span className="count">{loans.length}</span>
          </h2>
          <button
            className="btn btn-primary"
            onClick={() => setAddingLoan(true)}
            disabled={items.length === 0}
          >
            + {t.loans.new}
          </button>
        </div>

        {loans.length === 0 ? (
          <EmptyState message={t.loans.empty} />
        ) : (
          <LoansTable loans={loans} onChanged={detail.reload} />
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="section">
        <div className="section-header">
          <h2>
            {t.feedback.title} <span className="count">{feedback.length}</span>
          </h2>
          <button className="btn btn-secondary" onClick={() => setAddingFeedback(true)}>
            + {t.feedback.new}
          </button>
        </div>

        {feedback.length === 0 ? (
          <EmptyState message={t.feedback.empty} />
        ) : (
          <div className="feedback-list">
            {feedback.map((entry) => (
              <FeedbackCard key={entry.id} entry={entry} onChanged={detail.reload} />
            ))}
          </div>
        )}
      </section>

      {addingItem && (
        <NewItemModal
          projectId={id}
          types={types.data ?? []}
          models={models.data ?? []}
          statuses={statuses.data ?? []}
          locations={locations.data ?? []}
          onClose={() => setAddingItem(false)}
          onCreated={() => {
            setAddingItem(false);
            detail.reload();
          }}
        />
      )}

      {addingLoan && (
        <NewLoanModal
          projectId={id}
          items={items}
          locations={locations.data ?? []}
          onClose={() => setAddingLoan(false)}
          onCreated={() => {
            setAddingLoan(false);
            detail.reload();
          }}
        />
      )}

      {addingFeedback && (
        <NewFeedbackModal
          projectId={id}
          locations={locations.data ?? []}
          loans={loans}
          onClose={() => setAddingFeedback(false)}
          onCreated={() => {
            setAddingFeedback(false);
            detail.reload();
          }}
        />
      )}
    </>
  );
}

/* ========================================================================
 * Project items
 * ===================================================================== */
function ItemsTable({ items, onChanged }: { items: Item[]; onChanged: () => void }) {
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
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t.projectItems.type}</th>
              <th>{t.projectItems.model}</th>
              <th>{t.projectItems.serialId}</th>
              <th>{t.projectItems.status}</th>
              <th>{t.projectItems.location}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.type?.name ?? t.common.none}</td>
                <td>{item.model?.name ?? t.common.none}</td>
                <td>{item.serial_id ?? t.common.none}</td>
                <td>
                  <Badge tone="grey">{item.status?.name ?? t.common.none}</Badge>
                </td>
                <td>{locationLabel(item.location)}</td>
                <td className="actions">
                  <button
                    className="btn btn-ghost small danger"
                    disabled={busyId === item.id}
                    onClick={() => remove(item.id)}
                  >
                    {t.common.delete}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ========================================================================
 * Loans
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
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t.loans.item}</th>
              <th>{t.loans.location}</th>
              <th>{t.loans.quantity}</th>
              <th>{t.loans.loanedAt}</th>
              <th>{t.loans.dueAt}</th>
              <th>{t.loans.returnedAt}</th>
              <th>{t.loans.status}</th>
              <th>{t.loans.notes}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => (
              <tr key={loan.id} className={loan.is_overdue ? "row-alert" : ""}>
                <td>
                  <strong>{itemLabel(loan.item)}</strong>
                  {loan.item?.serial_id && (
                    <div className="muted small">{loan.item.serial_id}</div>
                  )}
                </td>
                <td>{locationLabel(loan.location)}</td>
                <td>{loan.quantity}</td>
                <td>{formatDate(loan.loaned_at)}</td>
                <td>{formatDate(loan.due_at)}</td>
                <td>{formatDate(loan.returned_at)}</td>
                <td>
                  <LoanStatusBadge loan={loan} />
                </td>
                <td className="muted small">{loan.notes ?? t.common.none}</td>
                <td className="actions">
                  {loan.status === "loaned" && (
                    <button
                      className="btn btn-ghost small"
                      disabled={busyId === loan.id}
                      onClick={() => run(loan.id, () => api.loans.markReturned(loan.id))}
                    >
                      {t.loans.markReturned}
                    </button>
                  )}
                  <button
                    className="btn btn-ghost small danger"
                    disabled={busyId === loan.id}
                    onClick={() => {
                      if (confirm(t.common.confirmDelete)) {
                        run(loan.id, () => api.loans.remove(loan.id));
                      }
                    }}
                  >
                    {t.common.delete}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function LoanStatusBadge({ loan }: { loan: Loan }) {
  if (loan.is_overdue) return <Badge tone="red">{t.loans.overdue}</Badge>;

  const tone: Record<LoanStatus, "amber" | "green" | "grey"> = {
    loaned: "amber",
    returned: "green",
    lost: "grey",
  };
  return <Badge tone={tone[loan.status]}>{t.loans.statusLabels[loan.status]}</Badge>;
}

/* ========================================================================
 * Feedback
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
      <header className="feedback-head">
        <div>
          <strong>{locationLabel(entry.location)}</strong>
          {entry.loan?.item && (
            <span className="muted small"> · {itemLabel(entry.loan.item)}</span>
          )}
        </div>
        <Rating value={entry.rating} />
      </header>

      <p className="feedback-body">{entry.content}</p>

      <footer className="feedback-foot">
        <time dateTime={entry.feedback_at} title={formatDateTime(entry.feedback_at)}>
          {formatRelative(entry.feedback_at)} · {formatDateTime(entry.feedback_at)}
        </time>
        <button className="btn btn-ghost small danger" onClick={remove}>
          {t.common.delete}
        </button>
      </footer>

      {error && <ErrorBanner error={error} />}
    </article>
  );
}

/* ========================================================================
 * Modals
 * ===================================================================== */
function NewItemModal({
  projectId,
  types,
  models,
  statuses,
  locations,
  onClose,
  onCreated,
}: {
  projectId: string;
  types: ItemType[];
  models: ItemModel[];
  statuses: ItemStatus[];
  locations: Location[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [typeId, setTypeId] = useState("");
  const [modelId, setModelId] = useState("");
  const [serialId, setSerialId] = useState("");
  const [statusId, setStatusId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const listsEmpty =
    types.length === 0 || statuses.length === 0 || locations.length === 0;
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
      await api.items.create({
        project_id: projectId,
        type_id: typeId,
        model_id: modelId,
        serial_id: serialId.trim() || null,
        status_id: statusId,
        location_id: locationId,
      });
      onCreated();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={t.projectItems.new} onClose={onClose}>
      <form onSubmit={submit} className="form">
        {listsEmpty && (
          <ErrorBanner error="הרשימות עדיין ריקות — הגדר סוגים, סטטוסים ומיקומים בעמוד ״הגדרות״ תחילה." />
        )}

        <div className="form-row">
          <Field label={t.projectItems.type} required>
            <select value={typeId} onChange={(e) => onTypeChange(e.target.value)} required autoFocus>
              <option value="">—</option>
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
              <option value="">{typeId ? "—" : t.projectItems.selectTypeFirst}</option>
              {modelsForType.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={t.projectItems.serialId}>
          <input value={serialId} onChange={(e) => setSerialId(e.target.value)} />
        </Field>

        <div className="form-row">
          <Field label={t.projectItems.status} required>
            <select value={statusId} onChange={(e) => setStatusId(e.target.value)} required>
              <option value="">—</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.projectItems.location} required>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
              <option value="">—</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {locationLabel(loc)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {error && <ErrorBanner error={error} />}

        <footer className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t.common.cancel}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || !typeId || !modelId || !statusId || !locationId}
          >
            {saving ? t.common.loading : t.common.save}
          </button>
        </footer>
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
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const catalogueEmpty = items.length === 0 || locations.length === 0;

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
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
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
      <form onSubmit={submit} className="form">
        {catalogueEmpty && (
          <ErrorBanner
            error={
              items.length === 0
                ? "אין עדיין פריטים בפרויקט זה — הוסף פריט תחילה."
                : "אין מיקומים רשומים — הוסף מיקום בעמוד ״הגדרות״ תחילה."
            }
          />
        )}

        <Field label={t.loans.item} required>
          <select value={itemId} onChange={(e) => setItemId(e.target.value)} required>
            <option value="">—</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {itemLabel(item)}
                {item.serial_id ? ` (${item.serial_id})` : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t.loans.location} required>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
            <option value="">—</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {locationLabel(loc)}
              </option>
            ))}
          </select>
        </Field>

        <div className="form-row">
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
        </div>

        <Field label={t.loans.dueAt}>
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </Field>

        <Field label={t.loans.notes}>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        {error && <ErrorBanner error={error} />}

        <footer className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t.common.cancel}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || !itemId || !locationId}
          >
            {saving ? t.common.loading : t.common.save}
          </button>
        </footer>
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
      <form onSubmit={submit} className="form">
        <Field label={t.feedback.relatedLoan}>
          <select value={loanId} onChange={(e) => onLoanChange(e.target.value)}>
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
            <option value="">—</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {locationLabel(loc)}
              </option>
            ))}
          </select>
        </Field>

        <div className="form-row">
          <Field label={t.feedback.rating}>
            <select value={rating} onChange={(e) => setRating(e.target.value)}>
              <option value="">{t.common.none}</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {"★".repeat(n)} ({n})
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.feedback.at} required>
            <input
              type="datetime-local"
              value={feedbackAt}
              onChange={(e) => setFeedbackAt(e.target.value)}
              required
            />
          </Field>
        </div>

        <Field label={t.feedback.content} required>
          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </Field>

        {error && <ErrorBanner error={error} />}

        <footer className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t.common.cancel}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || !locationId || !content.trim()}
          >
            {saving ? t.common.loading : t.common.save}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
