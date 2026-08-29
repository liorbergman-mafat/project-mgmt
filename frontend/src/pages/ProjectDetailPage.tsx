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
import { ContactFormModal } from "../components/ContactFormModal";
import { ItemFormModal } from "../components/ItemFormModal";
import {
  ConfirmModal,
  EmptyState,
  ErrorBanner,
  Field,
  FormActions,
  ITEM_STATUS_TONE,
  Modal,
  Pill,
  Spinner,
  Stars,
  Tabs,
} from "../components/ui";
import type { Tone } from "../components/ui";
import type { Contact, Feedback, Item, Loan, Location, ProjectStatus } from "../types";

const PROJECT_TONE: Record<ProjectStatus, Tone> = {
  active: "green",
  completed: "blue",
  archived: "grey",
};

type Tab = "items" | "loans" | "feedback";

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = projectId!;
  const shell = useShell();
  const navigate = useNavigate();

  const detail = useAsync(() => api.projects.detail(id), [id]);

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
          item={editingItem}
          defaultProjectId={id}
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
          loans={loans}
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
                <th>{t.loans.signer}</th>
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
                    {loan.signer?.full_name ?? t.common.none}
                    {loan.signer?.role && <span className="dim small"> · {loan.signer.role}</span>}
                    {loan.signer?.phone && <div className="dim small num">{loan.signer.phone}</div>}
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
function NewLoanModal({
  projectId,
  items,
  loans,
  locations,
  onClose,
  onCreated,
}: {
  projectId: string;
  items: Item[];
  loans: Loan[];
  locations: Location[];
  onClose: () => void;
  onCreated: () => void;
}) {
  // An item already out on an open loan can't be loaned again until it's
  // returned (or that loan deleted) — see backend/app/routers/loans.py.
  const loanableItems = items.filter(
    (item) => !loans.some((loan) => loan.item_id === item.id && loan.status === "loaned"),
  );

  const [itemId, setItemId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loanedAt, setLoanedAt] = useState(toLocalInputValue(new Date()));
  const [notes, setNotes] = useState("");
  const [signerContactId, setSignerContactId] = useState("");
  const [addingContact, setAddingContact] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // The signer is one of the destination unit's contacts, so the list (and
  // the current pick) resets whenever the chosen location changes.
  const contacts = useAsync(
    () => (locationId ? api.contacts.list(locationId) : Promise.resolve([])),
    [locationId],
  );

  function onLocationChange(value: string) {
    setLocationId(value);
    setSignerContactId("");
  }

  function onContactAdded(contact: Contact) {
    setAddingContact(false);
    setSignerContactId(contact.id);
    contacts.reload();
  }

  const invalid = !itemId || !locationId || quantity < 1 || !signerContactId;

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
        signer_contact_id: signerContactId,
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
          {(loanableItems.length === 0 || locations.length === 0) && (
            <div className="span-2">
              <ErrorBanner
                error={
                  items.length === 0
                    ? t.loans.noItems
                    : loanableItems.length === 0
                      ? t.loans.allLoaned
                      : t.loans.noLocations
                }
              />
            </div>
          )}

          <Field label={t.loans.item} required span>
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} required autoFocus>
              <option value="">{t.common.none}</option>
              {loanableItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {itemLabel(item)}
                  {item.serial_id ? ` · ${item.serial_id}` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.loans.location} required>
            <select
              value={locationId}
              onChange={(e) => onLocationChange(e.target.value)}
              required
            >
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

          <div className="span-2 form-section">{t.loans.signer}</div>

          <Field label={t.loans.signer} required span>
            {locationId ? (
              <>
                <select
                  value={signerContactId}
                  onChange={(e) => setSignerContactId(e.target.value)}
                  required
                  disabled={contacts.loading}
                >
                  <option value="">{t.loans.chooseSigner}</option>
                  {(contacts.data ?? []).map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.full_name}
                      {contact.role ? ` · ${contact.role}` : ""}
                    </option>
                  ))}
                </select>
                {contacts.data && contacts.data.length === 0 && (
                  <p className="muted small">{t.loans.noContactsForLocation}</p>
                )}
                <div className="row-actions" style={{ marginTop: 6 }}>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => setAddingContact(true)}
                  >
                    + {t.loans.addContact}
                  </button>
                </div>
              </>
            ) : (
              <p className="muted small">{t.loans.selectLocationFirst}</p>
            )}
          </Field>

          {error && (
            <div className="span-2">
              <ErrorBanner error={error} />
            </div>
          )}
        </div>

        <FormActions saving={saving} disabled={invalid} onCancel={onClose} />
      </form>

      {addingContact && locationId && (
        <ContactFormModal
          locationId={locationId}
          onClose={() => setAddingContact(false)}
          onSaved={onContactAdded}
        />
      )}
    </Modal>
  );
}

function NewFeedbackModal({
  projectId,
  locations,
  onClose,
  onCreated,
}: {
  projectId: string;
  locations: Location[];
  onClose: () => void;
  onCreated: () => void;
}) {
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
          <Field label={t.feedback.location} required>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              required
              autoFocus
            >
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
