import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api";
import { t } from "../i18n";
import { ErrorBanner, Field, FormActions, Modal } from "./ui";
import type { Contact } from "../types";

/**
 * Add / edit a contact (a person who can sign for a loan) at one location.
 * Opened both from the Settings locations tab and, for a quick add, from
 * inside the "new loan" modal.
 */
export function ContactFormModal({
  locationId,
  contact,
  onClose,
  onSaved,
}: {
  locationId: string;
  contact?: Contact | null;
  onClose: () => void;
  onSaved: (saved: Contact) => void;
}) {
  const [fullName, setFullName] = useState(contact?.full_name ?? "");
  const [personalNumber, setPersonalNumber] = useState(contact?.personal_number ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [role, setRole] = useState(contact?.role ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const invalid = !fullName.trim() || !personalNumber.trim() || !phone.trim();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = contact
        ? await api.contacts.update(contact.id, {
            full_name: fullName.trim(),
            personal_number: personalNumber.trim(),
            phone: phone.trim(),
            role: role.trim() || null,
          })
        : await api.contacts.create({
            location_id: locationId,
            full_name: fullName.trim(),
            personal_number: personalNumber.trim(),
            phone: phone.trim(),
            role: role.trim() || null,
          });
      onSaved(saved);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={contact ? t.contacts.edit : t.contacts.new} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-body">
          <Field label={t.contacts.fullName} required span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus />
          </Field>

          <Field label={t.contacts.personalNumber} required>
            <input
              value={personalNumber}
              onChange={(e) => setPersonalNumber(e.target.value)}
              required
            />
          </Field>

          <Field label={t.contacts.phone} required>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </Field>

          <Field label={t.contacts.role}>
            <input value={role} onChange={(e) => setRole(e.target.value)} />
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
