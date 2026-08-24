import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api";
import { useAsync } from "../hooks";
import { t } from "../i18n";
import { EmptyState, ErrorBanner, Field, Modal, Spinner } from "../components/ui";
import type { ItemType } from "../types";

type Tab = "types" | "models" | "statuses" | "locations";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("types");

  const tabs: { key: Tab; label: string }[] = [
    { key: "types", label: t.settings.tabs.types },
    { key: "models", label: t.settings.tabs.models },
    { key: "statuses", label: t.settings.tabs.statuses },
    { key: "locations", label: t.settings.tabs.locations },
  ];

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{t.settings.title}</h1>
          <p className="muted">{t.settings.subtitle}</p>
        </div>
        <div className="filter-tabs">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              className={`btn small ${tab === key ? "btn-secondary" : "btn-ghost"}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {tab === "types" && <TypesPanel />}
      {tab === "models" && <ModelsPanel />}
      {tab === "statuses" && <StatusesPanel />}
      {tab === "locations" && <LocationsPanel />}
    </>
  );
}

/* ========================================================================
 * Types — a flat, name-only list.
 * ===================================================================== */
function TypesPanel() {
  const { data, error, loading, reload } = useAsync(() => api.itemTypes.list());
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function remove(id: string) {
    if (!confirm(t.common.confirmDelete)) return;
    setActionError(null);
    try {
      await api.itemTypes.remove(id);
      reload();
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  return (
    <section className="section">
      <div className="section-header">
        <h2>{t.settings.tabs.types}</h2>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          + {t.itemTypes.new}
        </button>
      </div>

      {error && <ErrorBanner error={error} onRetry={reload} />}
      {actionError && <ErrorBanner error={actionError} />}
      {loading && <Spinner />}
      {data && data.length === 0 && <EmptyState message={t.itemTypes.empty} />}

      {data && data.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.itemTypes.name}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.name}</strong>
                  </td>
                  <td className="actions">
                    <button className="btn btn-ghost small danger" onClick={() => remove(row.id)}>
                      {t.common.delete}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <Modal title={t.itemTypes.new} onClose={() => setCreating(false)}>
          <NameOnlyForm
            onSubmit={(name) => api.itemTypes.create({ name })}
            onSaved={() => {
              setCreating(false);
              reload();
            }}
            onClose={() => setCreating(false)}
            label={t.itemTypes.name}
          />
        </Modal>
      )}
    </section>
  );
}

/* ========================================================================
 * Statuses — a flat, name-only list.
 * ===================================================================== */
function StatusesPanel() {
  const { data, error, loading, reload } = useAsync(() => api.itemStatuses.list());
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function remove(id: string) {
    if (!confirm(t.common.confirmDelete)) return;
    setActionError(null);
    try {
      await api.itemStatuses.remove(id);
      reload();
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  return (
    <section className="section">
      <div className="section-header">
        <h2>{t.settings.tabs.statuses}</h2>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          + {t.itemStatuses.new}
        </button>
      </div>

      {error && <ErrorBanner error={error} onRetry={reload} />}
      {actionError && <ErrorBanner error={actionError} />}
      {loading && <Spinner />}
      {data && data.length === 0 && <EmptyState message={t.itemStatuses.empty} />}

      {data && data.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.itemStatuses.name}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.name}</strong>
                  </td>
                  <td className="actions">
                    <button className="btn btn-ghost small danger" onClick={() => remove(row.id)}>
                      {t.common.delete}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <Modal title={t.itemStatuses.new} onClose={() => setCreating(false)}>
          <NameOnlyForm
            onSubmit={(name) => api.itemStatuses.create({ name })}
            onSaved={() => {
              setCreating(false);
              reload();
            }}
            onClose={() => setCreating(false)}
            label={t.itemStatuses.name}
          />
        </Modal>
      )}
    </section>
  );
}

/** Shared "just a name" add form for Types and Statuses. */
function NameOnlyForm({
  label,
  onSubmit,
  onSaved,
  onClose,
}: {
  label: string;
  onSubmit: (name: string) => Promise<unknown>;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(name.trim());
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="form">
      <Field label={label} required>
        <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
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
  );
}

/* ========================================================================
 * Models — name + the type it belongs to.
 * ===================================================================== */
function ModelsPanel() {
  const models = useAsync(() => api.itemModels.list());
  const types = useAsync(() => api.itemTypes.list());
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const typeName = (typeId: string) => types.data?.find((ty) => ty.id === typeId)?.name ?? t.common.none;

  async function remove(id: string) {
    if (!confirm(t.common.confirmDelete)) return;
    setActionError(null);
    try {
      await api.itemModels.remove(id);
      models.reload();
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  return (
    <section className="section">
      <div className="section-header">
        <h2>{t.settings.tabs.models}</h2>
        <button
          className="btn btn-primary"
          onClick={() => setCreating(true)}
          disabled={!types.data || types.data.length === 0}
        >
          + {t.itemModels.new}
        </button>
      </div>

      {(!types.data || types.data.length === 0) && !types.loading && (
        <ErrorBanner error={`${t.settings.tabs.types}: ${t.itemTypes.empty}`} />
      )}

      {models.error && <ErrorBanner error={models.error} onRetry={models.reload} />}
      {actionError && <ErrorBanner error={actionError} />}
      {models.loading && <Spinner />}
      {models.data && models.data.length === 0 && <EmptyState message={t.itemModels.empty} />}

      {models.data && models.data.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.itemModels.name}</th>
                <th>{t.itemModels.type}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {models.data.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.name}</strong>
                  </td>
                  <td>{typeName(row.type_id)}</td>
                  <td className="actions">
                    <button className="btn btn-ghost small danger" onClick={() => remove(row.id)}>
                      {t.common.delete}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <NewModelModal
          types={types.data ?? []}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            models.reload();
          }}
        />
      )}
    </section>
  );
}

function NewModelModal({
  types,
  onClose,
  onCreated,
}: {
  types: ItemType[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [typeId, setTypeId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.itemModels.create({ type_id: typeId, name: name.trim() });
      onCreated();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={t.itemModels.new} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <Field label={t.itemModels.type} required>
          <select value={typeId} onChange={(e) => setTypeId(e.target.value)} required autoFocus>
            <option value="">—</option>
            {types.map((ty) => (
              <option key={ty.id} value={ty.id}>
                {ty.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t.itemModels.name} required>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>

        {error && <ErrorBanner error={error} />}

        <footer className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t.common.cancel}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || !typeId || !name.trim()}
          >
            {saving ? t.common.loading : t.common.save}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

/* ========================================================================
 * Locations — units, warehouses, anywhere an item can be. Richer form.
 * ===================================================================== */
function LocationsPanel() {
  const { data, error, loading, reload } = useAsync(() => api.locations.list());
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function remove(id: string) {
    if (!confirm(t.common.confirmDelete)) return;
    setActionError(null);
    try {
      await api.locations.remove(id);
      reload();
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  return (
    <section className="section">
      <div className="section-header">
        <h2>{t.settings.tabs.locations}</h2>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          + {t.locations.new}
        </button>
      </div>

      {error && <ErrorBanner error={error} onRetry={reload} />}
      {actionError && <ErrorBanner error={actionError} />}
      {loading && <Spinner />}
      {data && data.length === 0 && <EmptyState message={t.locations.empty} />}

      {data && data.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.locations.name}</th>
                <th>{t.locations.kind}</th>
                <th>{t.locations.brigade}</th>
                <th>{t.locations.battalion}</th>
                <th>{t.locations.contactName}</th>
                <th>{t.locations.contactPhone}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.name}</strong>
                    {row.notes && <div className="muted small">{row.notes}</div>}
                  </td>
                  <td>{row.kind ?? t.common.none}</td>
                  <td>{row.brigade ?? t.common.none}</td>
                  <td>{row.battalion ?? t.common.none}</td>
                  <td>{row.contact_name ?? t.common.none}</td>
                  <td>{row.contact_phone ?? t.common.none}</td>
                  <td className="actions">
                    <button className="btn btn-ghost small danger" onClick={() => remove(row.id)}>
                      {t.common.delete}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <NewLocationModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            reload();
          }}
        />
      )}
    </section>
  );
}

function NewLocationModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "",
    kind: "",
    brigade: "",
    battalion: "",
    contact_name: "",
    contact_phone: "",
    notes: "",
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
      await api.locations.create({
        name: form.name.trim(),
        kind: form.kind.trim() || null,
        brigade: form.brigade.trim() || null,
        battalion: form.battalion.trim() || null,
        contact_name: form.contact_name.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        notes: form.notes.trim() || null,
      });
      onCreated();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={t.locations.new} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <div className="form-row">
          <Field label={t.locations.name} required>
            <input value={form.name} onChange={(e) => set("name")(e.target.value)} required autoFocus />
          </Field>
          <Field label={t.locations.kind}>
            <input value={form.kind} onChange={(e) => set("kind")(e.target.value)} placeholder="יחידה / מחסן" />
          </Field>
        </div>

        <div className="form-row">
          <Field label={t.locations.brigade}>
            <input value={form.brigade} onChange={(e) => set("brigade")(e.target.value)} />
          </Field>
          <Field label={t.locations.battalion}>
            <input value={form.battalion} onChange={(e) => set("battalion")(e.target.value)} />
          </Field>
        </div>

        <div className="form-row">
          <Field label={t.locations.contactName}>
            <input value={form.contact_name} onChange={(e) => set("contact_name")(e.target.value)} />
          </Field>
          <Field label={t.locations.contactPhone}>
            <input
              type="tel"
              value={form.contact_phone}
              onChange={(e) => set("contact_phone")(e.target.value)}
            />
          </Field>
        </div>

        <Field label={t.locations.notes}>
          <textarea rows={2} value={form.notes} onChange={(e) => set("notes")(e.target.value)} />
        </Field>

        {error && <ErrorBanner error={error} />}

        <footer className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t.common.cancel}
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || !form.name.trim()}>
            {saving ? t.common.loading : t.common.save}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
