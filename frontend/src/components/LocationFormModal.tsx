import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api";
import { t } from "../i18n";
import { ErrorBanner, Field, FormActions, Modal } from "./ui";
import type { Location } from "../types";

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
          <Field label={t.locations.contactName}>
            <input
              value={form.contact_name}
              onChange={(e) => set("contact_name")(e.target.value)}
            />
          </Field>

          <Field label={t.locations.contactPhone}>
            <input
              type="tel"
              value={form.contact_phone}
              onChange={(e) => set("contact_phone")(e.target.value)}
            />
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
    </Modal>
  );
}
