import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api";
import { useAsync } from "../hooks";
import { t } from "../i18n";
import { ContactFormModal } from "./ContactFormModal";
import { ErrorBanner, Field, FormActions, Modal, Spinner } from "./ui";
import type { Contact, Location } from "../types";

/**
 * Add / edit a location. Lives here rather than on a page because both the
 * locations directory and the Settings list open it.
 */
export function LocationFormModal({
  location,
  onClose,
  onSaved,
}: {
  location: Location | null;
  onClose: () => void;
  onSaved: (saved: Location) => void;
}) {
  const [form, setForm] = useState({
    name: location?.name ?? "",
    kind: location?.kind ?? "",
    category: location?.category ?? "",
    brigade: location?.brigade ?? "",
    battalion: location?.battalion ?? "",
    contact_name: location?.contact_name ?? "",
    contact_phone: location?.contact_phone ?? "",
    notes: location?.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: form.name.trim(),
        kind: form.kind.trim() || null,
        category: form.category.trim() || null,
        brigade: form.brigade.trim() || null,
        battalion: form.battalion.trim() || null,
        contact_name: form.contact_name.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        notes: form.notes.trim() || null,
      };
      const saved = location
        ? await api.locations.update(location.id, body)
        : await api.locations.create(body);
      onSaved(saved);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={location ? t.locations.edit : t.locations.new} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-body">
          <Field label={t.locations.name} required>
            <input value={form.name} onChange={(e) => set("name")(e.target.value)} required autoFocus />
          </Field>
          <Field label={t.locations.kind}>
            <input
              value={form.kind}
              onChange={(e) => set("kind")(e.target.value)}
              placeholder="יחידה / מחסן"
            />
          </Field>

          <Field label={t.locations.category}>
            <input
              value={form.category}
              onChange={(e) => set("category")(e.target.value)}
              placeholder="סדיר קחצ״ר / כלל צה״לי"
            />
          </Field>
          <Field label={t.locations.brigade}>
            <input value={form.brigade} onChange={(e) => set("brigade")(e.target.value)} />
          </Field>

          <Field label={t.locations.battalion}>
            <input value={form.battalion} onChange={(e) => set("battalion")(e.target.value)} />
          </Field>

          <Field label={t.locations.notes} span>
            <textarea rows={2} value={form.notes} onChange={(e) => set("notes")(e.target.value)} />
          </Field>

          {error && (
            <div className="span-2">
              <ErrorBanner error={error} />
            </div>
          )}
        </div>

        <FormActions saving={saving} disabled={!form.name.trim()} onCancel={onClose} />
      </form>

      {location && <ContactsPanel locationId={location.id} />}
    </Modal>
  );
}

/** The "who can sign for a loan" list nested inside an existing location's edit modal. */
function ContactsPanel({ locationId }: { locationId: string }) {
  const contacts = useAsync(() => api.contacts.list(locationId), [locationId]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(contact: Contact) {
    if (!confirm(t.common.confirmDelete)) return;
    setError(null);
    try {
      await api.contacts.remove(contact.id);
      contacts.reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="form-body single" style={{ paddingTop: 0 }}>
      <div className="form-section">{t.contacts.title}</div>

      {contacts.loading && <Spinner />}
      {contacts.error && <ErrorBanner error={contacts.error} onRetry={contacts.reload} />}
      {error && <ErrorBanner error={error} />}

      {contacts.data && contacts.data.length === 0 && (
        <p className="muted small">{t.contacts.empty}</p>
      )}

      {(contacts.data ?? []).map((contact) => (
        <div className="list-row" key={contact.id}>
          <div>
            <span className="list-row-name">{contact.full_name}</span>
            <span className="list-row-meta">
              {" "}
              · {contact.phone}
              {contact.role ? ` · ${contact.role}` : ""}
            </span>
          </div>
          <div className="row-actions">
            <button type="button" className="link-btn" onClick={() => setEditing(contact)}>
              {t.common.edit}
            </button>
            <button type="button" className="link-btn danger" onClick={() => remove(contact)}>
              {t.common.delete}
            </button>
          </div>
        </div>
      ))}

      <div className="group-foot">
        <button type="button" className="link-btn" onClick={() => setAdding(true)}>
          + {t.contacts.add}
        </button>
      </div>

      {(adding || editing) && (
        <ContactFormModal
          locationId={locationId}
          contact={editing}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={() => {
            setAdding(false);
            setEditing(null);
            contacts.reload();
          }}
        />
      )}
    </div>
  );
}
