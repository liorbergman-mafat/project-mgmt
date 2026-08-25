import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAsync } from "../hooks";
import { itemLabel, locationLabel, t } from "../i18n";
import { options, sortCategories } from "../locationGrouping";
import { useShell } from "../shellData";
import { LocationFormModal } from "../components/LocationFormModal";
import {
  EmptyState,
  ErrorBanner,
  Field,
  FilterChips,
  FormActions,
  Modal,
  Pill,
  Spinner,
  Tabs,
} from "../components/ui";
import type { ItemModel, ItemType, Location } from "../types";

/** A failed delete, kept alongside the row it was tried on so a "show items" action can target it. */
type DeleteFailure = { id: string; name: string; message: string };

/** The FK-violation message names items specifically when this text is present — see backend/app/main.py. */
function blockedByItems(message: string): boolean {
  return message.includes("פריטים");
}

type Tab = "types" | "models" | "statuses" | "locations";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("types");

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{t.settings.title}</h1>
          <p className="subtitle">{t.settings.subtitle}</p>
        </div>
      </header>

      <Tabs
        active={tab}
        onSelect={setTab}
        tabs={[
          { key: "types", label: t.settings.tabs.types },
          { key: "models", label: t.settings.tabs.models },
          { key: "statuses", label: t.settings.tabs.statuses },
          { key: "locations", label: t.settings.tabs.locations },
        ]}
      />

      {tab === "types" && <TypesPanel />}
      {tab === "models" && <ModelsPanel />}
      {tab === "statuses" && <StatusesPanel />}
      {tab === "locations" && <LocationsPanel />}
    </>
  );
}

/* ========================================================================
 * Shared chrome: the list card on the left, the explanatory note on the right.
 * ===================================================================== */
function ListLayout({
  title,
  count,
  addLabel,
  onAdd,
  children,
  above,
}: {
  title: string;
  count: number;
  addLabel: string;
  onAdd: () => void;
  children: ReactNode;
  above?: ReactNode;
}) {
  return (
    <>
      {above}
      <div className="split split-settings">
        <div className="list-card">
          <div className="list-card-head">
            <span>{title}</span>
            <span className="count num">{t.settings.entries(count)}</span>
          </div>

          {children}

          <div className="list-card-foot">
            <button className="btn btn-dashed" onClick={onAdd}>
              + {addLabel}
            </button>
          </div>
        </div>

        <p className="note-card">{t.settings.note}</p>
      </div>
    </>
  );
}

function ListRow({
  name,
  meta,
  onEdit,
  onDelete,
}: {
  name: string;
  meta?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="list-row">
      <div>
        <span className="list-row-name">{name}</span>
        {meta && <span className="list-row-meta"> · {meta}</span>}
      </div>
      <div className="row-actions">
        <button className="link-btn" onClick={onEdit}>
          {t.common.edit}
        </button>
        <button className="link-btn danger" onClick={onDelete}>
          {t.common.delete}
        </button>
      </div>
    </div>
  );
}

/* ========================================================================
 * Types — a flat, name-only list; the meta says how many models hang off it.
 * ===================================================================== */
function TypesPanel() {
  const types = useAsync(() => api.itemTypes.list());
  const models = useAsync(() => api.itemModels.list());
  const [editing, setEditing] = useState<ItemType | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<DeleteFailure | null>(null);
  const [viewingItems, setViewingItems] = useState<DeleteFailure | null>(null);

  async function remove(id: string, name: string) {
    if (!confirm(t.common.confirmDelete)) return;
    setActionError(null);
    try {
      await api.itemTypes.remove(id);
      types.reload();
    } catch (err) {
      setActionError({ id, name, message: (err as Error).message });
    }
  }

  const rows = types.data ?? [];

  return (
    <>
      {types.error && <ErrorBanner error={types.error} onRetry={types.reload} />}
      <DeleteError failure={actionError} onShowItems={setViewingItems} />
      {types.loading && <Spinner />}

      <ListLayout
        title={t.settings.tabs.types}
        count={rows.length}
        addLabel={t.itemTypes.new}
        onAdd={() => setCreating(true)}
      >
        {rows.length === 0 && !types.loading && <EmptyState message={t.itemTypes.empty} />}
        {rows.map((row) => (
          <ListRow
            key={row.id}
            name={row.name}
            meta={t.itemTypes.modelCount(
              (models.data ?? []).filter((m) => m.type_id === row.id).length,
            )}
            onEdit={() => setEditing(row)}
            onDelete={() => remove(row.id, row.name)}
          />
        ))}
      </ListLayout>

      {(creating || editing) && (
        <Modal
          title={editing ? t.itemTypes.edit : t.itemTypes.new}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        >
          <NameOnlyForm
            label={t.itemTypes.name}
            initial={editing?.name ?? ""}
            onSubmit={(name) =>
              editing ? api.itemTypes.update(editing.id, { name }) : api.itemTypes.create({ name })
            }
            onSaved={() => {
              setCreating(false);
              setEditing(null);
              types.reload();
            }}
            onClose={() => {
              setCreating(false);
              setEditing(null);
            }}
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
    </>
  );
}

/* ========================================================================
 * Statuses — a flat, name-only list.
 * ===================================================================== */
function StatusesPanel() {
  const statuses = useAsync(() => api.itemStatuses.list());
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<DeleteFailure | null>(null);
  const [viewingItems, setViewingItems] = useState<DeleteFailure | null>(null);

  async function remove(id: string, name: string) {
    if (!confirm(t.common.confirmDelete)) return;
    setActionError(null);
    try {
      await api.itemStatuses.remove(id);
      statuses.reload();
    } catch (err) {
      setActionError({ id, name, message: (err as Error).message });
    }
  }

  const rows = statuses.data ?? [];

  return (
    <>
      {statuses.error && <ErrorBanner error={statuses.error} onRetry={statuses.reload} />}
      <DeleteError failure={actionError} onShowItems={setViewingItems} />
      {statuses.loading && <Spinner />}

      <ListLayout
        title={t.settings.tabs.statuses}
        count={rows.length}
        addLabel={t.itemStatuses.new}
        onAdd={() => setCreating(true)}
      >
        {rows.length === 0 && !statuses.loading && <EmptyState message={t.itemStatuses.empty} />}
        {rows.map((row) => (
          <ListRow
            key={row.id}
            name={row.name}
            onEdit={() => setEditing(row)}
            onDelete={() => remove(row.id, row.name)}
          />
        ))}
      </ListLayout>

      {(creating || editing) && (
        <Modal
          title={editing ? t.itemStatuses.edit : t.itemStatuses.new}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        >
          <NameOnlyForm
            label={t.itemStatuses.name}
            initial={editing?.name ?? ""}
            onSubmit={(name) =>
              editing
                ? api.itemStatuses.update(editing.id, { name })
                : api.itemStatuses.create({ name })
            }
            onSaved={() => {
              setCreating(false);
              setEditing(null);
              statuses.reload();
            }}
            onClose={() => {
              setCreating(false);
              setEditing(null);
            }}
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
    </>
  );
}

/** Shared "just a name" form for Types and Statuses, add and edit alike. */
function NameOnlyForm({
  label,
  initial,
  onSubmit,
  onSaved,
  onClose,
}: {
  label: string;
  initial: string;
  onSubmit: (name: string) => Promise<unknown>;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial);
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
    <form onSubmit={submit}>
      <div className="form-body single">
        <Field label={label} required>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        {error && <ErrorBanner error={error} />}
      </div>
      <FormActions saving={saving} disabled={!name.trim()} onCancel={onClose} />
    </form>
  );
}

/* ========================================================================
 * Models — name + the type it belongs to.
 * ===================================================================== */
function ModelsPanel() {
  const models = useAsync(() => api.itemModels.list());
  const types = useAsync(() => api.itemTypes.list());
  const [editing, setEditing] = useState<ItemModel | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<DeleteFailure | null>(null);
  const [viewingItems, setViewingItems] = useState<DeleteFailure | null>(null);

  const typeName = (typeId: string) =>
    types.data?.find((ty) => ty.id === typeId)?.name ?? t.common.none;

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

  const rows = models.data ?? [];
  const noTypes = !types.loading && (types.data ?? []).length === 0;

  return (
    <>
      {noTypes && <ErrorBanner error={`${t.settings.tabs.types}: ${t.itemTypes.empty}`} />}
      {models.error && <ErrorBanner error={models.error} onRetry={models.reload} />}
      <DeleteError failure={actionError} onShowItems={setViewingItems} />
      {models.loading && <Spinner />}

      <ListLayout
        title={t.settings.tabs.models}
        count={rows.length}
        addLabel={t.itemModels.new}
        onAdd={() => setCreating(true)}
      >
        {rows.length === 0 && !models.loading && <EmptyState message={t.itemModels.empty} />}
        {rows.map((row) => (
          <ListRow
            key={row.id}
            name={row.name}
            meta={typeName(row.type_id)}
            onEdit={() => setEditing(row)}
            onDelete={() => remove(row.id, row.name)}
          />
        ))}
      </ListLayout>

      {(creating || editing) && (
        <ModelFormModal
          model={editing}
          types={types.data ?? []}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
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
    </>
  );
}

function ModelFormModal({
  model,
  types,
  onClose,
  onSaved,
}: {
  model: ItemModel | null;
  types: ItemType[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [typeId, setTypeId] = useState(model?.type_id ?? "");
  const [name, setName] = useState(model?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = { type_id: typeId, name: name.trim() };
      if (model) await api.itemModels.update(model.id, body);
      else await api.itemModels.create(body);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={model ? t.itemModels.edit : t.itemModels.new} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-body">
          <Field label={t.itemModels.type} required>
            <select value={typeId} onChange={(e) => setTypeId(e.target.value)} required autoFocus>
              <option value="">{t.common.none}</option>
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

          {error && (
            <div className="span-2">
              <ErrorBanner error={error} />
            </div>
          )}
        </div>
        <FormActions saving={saving} disabled={!typeId || !name.trim()} onCancel={onClose} />
      </form>
    </Modal>
  );
}

/* ========================================================================
 * Locations — units, warehouses, anywhere an item can be.
 *
 * There are a few hundred of these, so the list stays behind the same two
 * filters the directory screen uses rather than rendering the lot.
 * ===================================================================== */
const DEFAULT_KIND = "יחידה";
const DEFAULT_CATEGORY = "סדיר קחצ״ר";

function LocationsPanel() {
  const shell = useShell();
  const { data, error, loading, reload } = shell.locations;
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [kind, setKind] = useState(DEFAULT_KIND);
  const [category, setCategory] = useState(DEFAULT_CATEGORY);

  const all = data ?? [];

  const kinds = useMemo(
    () => options(all, (row) => row.kind).map((value) => ({ key: value, label: value })),
    [all],
  );

  // The defaults are the common case, not a guarantee: if this deployment has
  // no such kind or category, fall back to the first one that does exist so
  // the list is never empty for a reason the chips do not show.
  const activeKind = kinds.some((k) => k.key === kind) ? kind : kinds[0]?.key ?? "";

  const categories = useMemo(
    () =>
      sortCategories(
        options(
          all.filter((row) => row.kind === activeKind),
          (row) => row.category,
        ),
      ).map((value) => ({ key: value, label: value })),
    [all, activeKind],
  );

  const activeCategory = categories.some((c) => c.key === category)
    ? category
    : categories[0]?.key ?? "";

  const visible = all.filter(
    (row) => row.kind === activeKind && row.category === activeCategory,
  );

  // Switching kind can leave the current category with no rows under it —
  // `activeCategory` above then falls back to that kind's first category.
  const selectKind = setKind;

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
    <>
      {error && <ErrorBanner error={error} onRetry={reload} />}
      {actionError && <ErrorBanner error={actionError} />}
      {loading && <Spinner />}
      {data && all.length === 0 && <EmptyState message={t.locations.empty} />}

      {all.length > 0 && (
        <ListLayout
          title={t.settings.tabs.locations}
          count={visible.length}
          addLabel={t.locations.new}
          onAdd={() => setCreating(true)}
          above={
            <>
              <FilterChips
                label={t.locations.kind}
                values={kinds}
                selected={activeKind}
                onSelect={selectKind}
              />
              {categories.length > 1 && (
                <FilterChips
                  label={t.locations.category}
                  values={categories}
                  selected={activeCategory}
                  onSelect={setCategory}
                />
              )}
            </>
          }
        >
          {visible.length === 0 && <EmptyState message={t.locations.noMatches} />}
          {visible.map((row) => (
            <ListRow
              key={row.id}
              name={row.name}
              meta={row.battalion ?? row.brigade ?? undefined}
              onEdit={() => setEditing(row)}
              onDelete={() => remove(row.id)}
            />
          ))}
        </ListLayout>
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
    </>
  );
}

/* ========================================================================
 * A blocked delete, and the items that blocked it.
 * ===================================================================== */
function DeleteError({
  failure,
  onShowItems,
}: {
  failure: DeleteFailure | null;
  onShowItems: (failure: DeleteFailure) => void;
}) {
  if (!failure) return null;
  const canShow = blockedByItems(failure.message);
  return (
    <ErrorBanner
      error={failure.message}
      actionLabel={canShow ? t.settings.showLinkedItems : undefined}
      onAction={canShow ? () => onShowItems(failure) : undefined}
    />
  );
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
  const shell = useShell();
  const items = useAsync(
    () => api.items.list(filter),
    [filter.typeId, filter.modelId, filter.statusId],
  );
  const projectsById = new Map((shell.projects.data ?? []).map((p) => [p.id, p]));

  return (
    <Modal title={title} onClose={onClose} wide>
      <div className="form-body single">
        {items.loading && <Spinner />}
        {items.error && <ErrorBanner error={items.error} onRetry={items.reload} />}
        {items.data && items.data.length === 0 && (
          <EmptyState message={t.settings.linkedItemsEmpty} />
        )}

        {items.data && items.data.length > 0 && (
          <div className="table-card">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t.units.project}</th>
                    <th>{t.projectItems.typeAndModel}</th>
                    <th>{t.projectItems.serialId}</th>
                    <th>{t.projectItems.status}</th>
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
                        <td className="strong">{itemLabel(item)}</td>
                        <td className="num">{item.serial_id ?? t.common.none}</td>
                        <td>
                          <Pill tone="grey">{item.status?.name ?? t.common.none}</Pill>
                        </td>
                        <td>{locationLabel(item.location)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
