import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api";
import { useAsync } from "../hooks";
import { t } from "../i18n";
import { formatUnitName, options, sortCategories, splitUnitName } from "../locationGrouping";
import { useShell } from "../shellData";
import { ContactFormModal } from "./ContactFormModal";
import { PlusIcon } from "./icons";
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
  const shell = useShell();
  const rows = shell.locations.data ?? [];

  const [form, setForm] = useState({
    kind: location?.kind ?? "",
    category: location?.category ?? "",
    brigade: location?.brigade ?? "",
    contact_name: location?.contact_name ?? "",
    contact_phone: location?.contact_phone ?? "",
    notes: location?.notes ?? "",
  });
  // The battalion is stored as one string but asked for in two halves, so it
  // is held apart from the rest of the form and joined on submit. It is also
  // the unit's name — a unit has no name of its own beyond its battalion
  // number/name — so the joined value is written to `name` as well.
  const [battalion, setBattalion] = useState(() => splitUnitName(location?.battalion ?? null));
  // Categories and brigades the directory doesn't use yet: they become real
  // only once this location is saved with one selected, so until then they
  // live here, at the top of their own picker.
  const [addedCategories, setAddedCategories] = useState<string[]>([]);
  const [addedBrigades, setAddedBrigades] = useState<string[]>([]);
  const [adding, setAdding] = useState<"category" | "brigade" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // What the two pickers offer: every value already in the directory, plus
  // anything added in this session, plus the row's own value — an existing
  // location must never lose the category or brigade it was saved with just
  // because nothing else uses it.
  const categories = useMemo(
    () => withValue(sortCategories(options(rows, (row) => row.category)), addedCategories, form.category),
    [rows, addedCategories, form.category],
  );
  // Brigade is scoped to the chosen category: the same brigade name sits
  // under two categories and those are different organisations — see
  // locationGrouping.groupByBrigade.
  const brigades = useMemo(() => {
    const inCategory = form.category ? rows.filter((row) => row.category === form.category) : rows;
    return withValue(options(inCategory, (row) => row.brigade), addedBrigades, form.brigade);
  }, [rows, addedBrigades, form.category, form.brigade]);

  // A "יחידה" files under a category and a brigade; a "מחסן" needn't.
  const [unitKind] = t.locations.kindOptions;
  const isUnit = form.kind === unitKind;
  const battalionName = formatUnitName(battalion.number, battalion.name);
  const valid =
    Boolean(form.kind) &&
    Boolean(battalionName || location?.name) &&
    (!isUnit || (Boolean(form.category.trim()) && Boolean(form.brigade.trim())));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        // A unit is identified by its battalion, so that is its name too;
        // fall back to the existing name for any older row saved without one.
        name: battalionName || location?.name?.trim() || "",
        kind: form.kind.trim() || null,
        category: form.category.trim() || null,
        brigade: form.brigade.trim() || null,
        battalion: battalionName || null,
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
          <Field label={t.locations.kind} required>
            <select value={form.kind} onChange={(e) => set("kind")(e.target.value)}>
              <option value="">{t.locations.selectKind}</option>
              {withValue(t.locations.kindOptions, [], form.kind).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.locations.category} required={isUnit}>
            <Picker
              value={form.category}
              onChange={(value) => {
                set("category")(value);
                // The brigade list is scoped to the category, so a brigade
                // picked under the old one no longer belongs here.
                if (value !== form.category) set("brigade")("");
              }}
              options={categories}
              placeholder={t.locations.selectCategory}
              addLabel={t.locations.addCategory}
              onAdd={() => setAdding("category")}
            />
          </Field>

          <Field label={t.locations.brigade} required={isUnit}>
            <Picker
              value={form.brigade}
              onChange={set("brigade")}
              options={brigades}
              placeholder={t.locations.selectBrigade}
              addLabel={t.locations.addBrigade}
              onAdd={() => setAdding("brigade")}
            />
          </Field>

          {/* The battalion has no list to pick from — a unit's own number or
              name is new nearly every time — so its two halves are asked for
              directly, and joined into the stored format on save. That joined
              value is the unit's name as well, so it stands in for a name
              field of its own. */}
          <Field label={t.locations.battalionNumber}>
            <input
              value={battalion.number}
              inputMode="numeric"
              autoFocus
              onChange={(e) => setBattalion((prev) => ({ ...prev, number: e.target.value }))}
            />
          </Field>

          <Field label={t.locations.battalionName}>
            <input
              value={battalion.name}
              onChange={(e) => setBattalion((prev) => ({ ...prev, name: e.target.value }))}
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

        <FormActions saving={saving} disabled={!valid} onCancel={onClose} />
      </form>

      {location && <ContactsPanel locationId={location.id} />}

      {adding === "category" && (
        <NewValueModal
          title={t.locations.newCategory}
          nameLabel={t.locations.categoryName}
          taken={categories}
          onClose={() => setAdding(null)}
          onAdd={(value) => {
            setAddedCategories((prev) => [...prev, value]);
            set("category")(value);
            set("brigade")("");
            setAdding(null);
          }}
        />
      )}

      {adding === "brigade" && (
        <NewValueModal
          title={t.locations.newBrigade}
          numberLabel={t.locations.brigadeNumber}
          nameLabel={t.locations.brigadeName}
          taken={brigades}
          onClose={() => setAdding(null)}
          onAdd={(value) => {
            setAddedBrigades((prev) => [...prev, value]);
            set("brigade")(value);
            setAdding(null);
          }}
        />
      )}
    </Modal>
  );
}

/** The directory's own values, plus what this form added, plus the row's own. */
function withValue(existing: readonly string[], added: readonly string[], current: string): string[] {
  const seen = new Set(existing);
  const extra: string[] = [];
  for (const value of [...added, current]) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    extra.push(value);
  }
  return [...extra, ...existing];
}

/* ========================================================================
 * Picker — a dropdown of the values the directory already uses, with a "+"
 * for one it doesn't. Free text is deliberately not accepted here: category
 * and brigade are what the whole directory groups by, and a typo silently
 * splits a brigade into two (see locationGrouping), so a new value is named
 * once, in a form that says what it is being added to.
 * ===================================================================== */
function Picker({
  value,
  onChange,
  options: values,
  placeholder,
  addLabel,
  onAdd,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  addLabel: string;
  onAdd: () => void;
}) {
  return (
    <div className="picker">
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {values.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <button type="button" className="icon-btn picker-add" onClick={onAdd} title={addLabel} aria-label={addLabel}>
        <PlusIcon />
      </button>
    </div>
  );
}

/**
 * Name a category or a brigade without leaving the location form.
 *
 * Nothing is written to the server here — a category and a brigade are
 * columns on the location row, not tables of their own, so the value becomes
 * real when the location that carries it is saved. With `numberLabel` set it
 * asks for the two halves a brigade is written from; either half may be left
 * out, but not both.
 */
function NewValueModal({
  title,
  numberLabel,
  nameLabel,
  taken,
  onClose,
  onAdd,
}: {
  title: string;
  /** Set for a brigade; a category is a single name. */
  numberLabel?: string;
  nameLabel: string;
  /** Values already on the list, so the same one isn't added twice. */
  taken: string[];
  onClose: () => void;
  onAdd: (value: string) => void;
}) {
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");

  const value = numberLabel ? formatUnitName(number, name) : name.trim();

  function submit(e: FormEvent) {
    e.preventDefault();
    // Save stays disabled until there is a value, so there is nothing to
    // validate here — only the duplicate to fold back onto the list's own
    // entry rather than adding a second copy of it.
    onAdd(taken.find((option) => option === value) ?? value);
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit}>
        {/* Number and name side by side for a brigade; a category is one
            field, so it takes the whole row rather than half of it. */}
        <div className="form-body">
          {numberLabel && (
            <Field label={numberLabel} hint={t.locations.numberOrName}>
              <input
                value={number}
                inputMode="numeric"
                autoFocus
                onChange={(e) => setNumber(e.target.value)}
              />
            </Field>
          )}
          <Field label={nameLabel} required={!numberLabel} span={!numberLabel}>
            <input
              value={name}
              autoFocus={!numberLabel}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        </div>
        <FormActions saving={false} disabled={!value} onCancel={onClose} />
      </form>
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
