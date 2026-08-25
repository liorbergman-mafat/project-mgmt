import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAsync } from "../hooks";
import { locationLabel, t } from "../i18n";
import { EmptyState, ErrorBanner, Field, FilterChips, Modal, Spinner } from "../components/ui";
import { groupByBrigade, options, sortCategories } from "../locationGrouping";
import type { ItemType, Location } from "../types";

/** A failed delete, kept alongside the row it was tried on so a "show items" action can target it. */
type DeleteFailure = { id: string; name: string; message: string };

/** The FK-violation message names items specifically when this text is present — see backend/app/main.py. */
function blockedByItems(message: string): boolean {
  return message.includes("פריטים");
}

/**
 * Shows every item currently using a given type/model/status, with a link to
 * that item's project — the only place items can be edited or deleted. Used
 * when a delete is blocked, so the user can find and clear what's blocking it.
 */
function LinkedItemsModal({
  title,
  filter,
  onClose,
}: {
  title: string;
  filter: { typeId?: string; modelId?: string; statusId?: string };
  onClose: () => void;
}) {
  const items = useAsync(
    () => api.items.list(filter),
    [filter.typeId, filter.modelId, filter.statusId],
  );
  const projects = useAsync(() => api.projects.list(), []);
  const projectsById = new Map((projects.data ?? []).map((p) => [p.id, p]));

  return (
    <Modal title={title} onClose={onClose}>
      {items.loading && <Spinner />}
      {items.error && <ErrorBanner error={items.error} onRetry={items.reload} />}
      {items.data && items.data.length === 0 && <EmptyState message={t.settings.linkedItemsEmpty} />}

      {items.data && items.data.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.units.project}</th>
                <th>{t.projectItems.type}</th>
                <th>{t.projectItems.model}</th>
                <th>{t.projectItems.serialId}</th>
                <th>{t.projectItems.location}</th>
              </tr>
            </thead>
            <tbody>
              {items.data.map((item) => {
                const project = projectsById.get(item.project_id);
                return (
                  <tr key={item.id}>
                    <td>
                      {project ? (
                        <Link to={`/projects/${project.id}`} onClick={onClose}>
                          {project.name}
                        </Link>
                      ) : (
                        t.common.none
                      )}
                    </td>
                    <td>{item.type?.name ?? t.common.none}</td>
                    <td>{item.model?.name ?? t.common.none}</td>
                    <td>{item.serial_id ?? t.common.none}</td>
                    <td>{locationLabel(item.location)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

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
  const [actionError, setActionError] = useState<DeleteFailure | null>(null);
  const [viewingItems, setViewingItems] = useState<DeleteFailure | null>(null);

  async function remove(id: string, name: string) {
    if (!confirm(t.common.confirmDelete)) return;
    setActionError(null);
    try {
      await api.itemTypes.remove(id);
      reload();
    } catch (err) {
      setActionError({ id, name, message: (err as Error).message });
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
      {actionError && (
        <ErrorBanner
          error={actionError.message}
          actionLabel={blockedByItems(actionError.message) ? t.settings.showLinkedItems : undefined}
          onAction={blockedByItems(actionError.message) ? () => setViewingItems(actionError) : undefined}
        />
      )}
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
                    <button className="btn btn-ghost small danger" onClick={() => remove(row.id, row.name)}>
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

      {viewingItems && (
        <LinkedItemsModal
          title={t.settings.linkedItemsTitle(viewingItems.name)}
          filter={{ typeId: viewingItems.id }}
          onClose={() => setViewingItems(null)}
        />
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
  const [actionError, setActionError] = useState<DeleteFailure | null>(null);
  const [viewingItems, setViewingItems] = useState<DeleteFailure | null>(null);

  async function remove(id: string, name: string) {
    if (!confirm(t.common.confirmDelete)) return;
    setActionError(null);
    try {
      await api.itemStatuses.remove(id);
      reload();
    } catch (err) {
      setActionError({ id, name, message: (err as Error).message });
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
      {actionError && (
        <ErrorBanner
          error={actionError.message}
          actionLabel={blockedByItems(actionError.message) ? t.settings.showLinkedItems : undefined}
          onAction={blockedByItems(actionError.message) ? () => setViewingItems(actionError) : undefined}
        />
      )}
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
                    <button className="btn btn-ghost small danger" onClick={() => remove(row.id, row.name)}>
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

      {viewingItems && (
        <LinkedItemsModal
          title={t.settings.linkedItemsTitle(viewingItems.name)}
          filter={{ statusId: viewingItems.id }}
          onClose={() => setViewingItems(null)}
        />
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
  const [actionError, setActionError] = useState<DeleteFailure | null>(null);
  const [viewingItems, setViewingItems] = useState<DeleteFailure | null>(null);

  const typeName = (typeId: string) => types.data?.find((ty) => ty.id === typeId)?.name ?? t.common.none;

  async function remove(id: string, name: string) {
    if (!confirm(t.common.confirmDelete)) return;
    setActionError(null);
    try {
      await api.itemModels.remove(id);
      models.reload();
    } catch (err) {
      setActionError({ id, name, message: (err as Error).message });
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
      {actionError && (
        <ErrorBanner
          error={actionError.message}
          actionLabel={blockedByItems(actionError.message) ? t.settings.showLinkedItems : undefined}
          onAction={blockedByItems(actionError.message) ? () => setViewingItems(actionError) : undefined}
        />
      )}
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
                    <button
                      className="btn btn-ghost small danger"
                      onClick={() => remove(row.id, row.name)}
                    >
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

      {viewingItems && (
        <LinkedItemsModal
          title={t.settings.linkedItemsTitle(viewingItems.name)}
          filter={{ modelId: viewingItems.id }}
          onClose={() => setViewingItems(null)}
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

type LocationFilters = { kind: string; category: string };

// There is always a selected kind and category — no "all" option — so the
// list opens already narrowed to the common case instead of the full 241 rows.
const DEFAULT_FILTERS: LocationFilters = { kind: "יחידה", category: "סדיר קחצ״ר" };

function matches(row: Location, f: Partial<LocationFilters>): boolean {
  return (!f.kind || row.kind === f.kind) && (!f.category || row.category === f.category);
}

function LocationsPanel() {
  const { data, error, loading, reload } = useAsync(() => api.locations.list());
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LocationFilters>(DEFAULT_FILTERS);

  // The category list is narrowed by the kind filter above it, so picking a
  // kind leaves only that kind's categories to choose from.
  const { kinds, categories, visible } = useMemo(() => {
    const rows = data ?? [];
    return {
      kinds: options(rows, (row) => row.kind),
      categories: sortCategories(
        options(rows.filter((row) => matches(row, { kind: filters.kind })), (row) => row.category),
      ),
      visible: rows.filter((row) => matches(row, filters)),
    };
  }, [data, filters]);

  // Switching kind can leave the current category invalid for it (a kind
  // with no such category), so fall back to that kind's first category
  // rather than pointing the filter at a combination with zero matches.
  function selectKind(kind: string) {
    const rows = data ?? [];
    const validCategories = sortCategories(
      options(
        rows.filter((row) => row.kind === kind),
        (row) => row.category,
      ),
    );
    setFilters({
      kind,
      category: validCategories.includes(filters.category) ? filters.category : validCategories[0] ?? filters.category,
    });
  }

  const brigadeGroups = useMemo(() => groupByBrigade(visible), [visible]);
  const [open, setOpen] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

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
        <div className="filters">
          <FilterChips label={t.locations.kind} values={kinds} selected={filters.kind} onSelect={selectKind} />
          <FilterChips
            label={t.locations.category}
            values={categories}
            selected={filters.category}
            onSelect={(category) => setFilters({ ...filters, category })}
          />

          <div className="filter-summary">
            <span className="muted small">{t.locations.showing(visible.length, data.length)}</span>
          </div>
        </div>
      )}

      {data && data.length > 0 && visible.length === 0 && <EmptyState message={t.locations.noMatches} />}

      {visible.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.locations.name}</th>
                <th>{t.locations.battalion}</th>
                <th>{t.locations.contactName}</th>
                <th>{t.locations.contactPhone}</th>
                <th />
              </tr>
            </thead>

            {brigadeGroups.map((group) => (
              <tbody key={group.key}>
                <tr className="group-row">
                  <td colSpan={5}>
                    <button
                      className="group-toggle"
                      aria-expanded={open.has(group.key)}
                      onClick={() => toggle(group.key)}
                    >
                      <span className="chevron" aria-hidden="true">
                        {open.has(group.key) ? "▾" : "▸"}
                      </span>
                      <span className="group-name">{group.label}</span>
                      <span className="muted small">{t.locations.battalionCount(group.rows.length)}</span>
                    </button>
                  </td>
                </tr>

                {open.has(group.key) &&
                  group.rows.map((row) => (
                    <tr key={row.id}>
                      <td className="leaf-cell">
                        <strong>{row.name}</strong>
                        {row.notes && <div className="muted small">{row.notes}</div>}
                      </td>
                      <td>{row.battalion ?? t.common.none}</td>
                      <td>{row.contact_name ?? t.common.none}</td>
                      <td>{row.contact_phone ?? t.common.none}</td>
                      <td className="actions">
                        <button className="btn btn-ghost small" onClick={() => setEditing(row)}>
                          {t.common.edit}
                        </button>
                        <button className="btn btn-ghost small danger" onClick={() => remove(row.id)}>
                          {t.common.delete}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            ))}
          </table>
        </div>
      )}

      {(creating || editing) && (
        <LocationFormModal
          location={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            reload();
          }}
        />
      )}
    </section>
  );
}

function LocationFormModal({
  location,
  onClose,
  onSaved,
}: {
  location: Location | null;
  onClose: () => void;
  onSaved: () => void;
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
      if (location) {
        await api.locations.update(location.id, body);
      } else {
        await api.locations.create(body);
      }
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={location ? t.locations.edit : t.locations.new} onClose={onClose}>
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
        </div>

        <div className="form-row">
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
