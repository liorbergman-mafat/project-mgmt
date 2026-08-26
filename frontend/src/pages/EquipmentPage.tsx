import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAsync } from "../hooks";
import { itemLabel, locationLabel, t } from "../i18n";
import { useShell } from "../shellData";
import { ItemFormModal } from "../components/ItemFormModal";
import {
  EmptyState,
  ErrorBanner,
  Field,
  FormActions,
  Modal,
  Pill,
  Spinner,
} from "../components/ui";
import type { Item, ItemModel, ItemType } from "../types";

/** A failed delete, kept alongside the row it was tried on so a "show items" action can target it. */
type DeleteFailure = {
  id: string;
  name: string;
  message: string;
  /** Which list the row came from, so the "show items" filter targets the right column. */
  scope?: "type" | "model";
};

/** The FK-violation message names items specifically when this text is present — see backend/app/main.py. */
function blockedByItems(message: string): boolean {
  return message.includes("פריטים");
}

/**
 * Equipment — three levels deep: every type, its models, and the actual
 * pieces of equipment registered under each model. A standalone page (not a
 * Settings tab) since equipment is managed on its own, not tucked away.
 *
 * Types and models share this page because a model means nothing without its
 * type, and the equipment itself belongs here because a serial number means
 * nothing without its model. Expanding a row is how you reach the level below.
 */
export default function EquipmentPage() {
  const shell = useShell();
  const types = useAsync(() => api.itemTypes.list());
  const models = useAsync(() => api.itemModels.list());
  const items = shell.items;

  const [creatingType, setCreatingType] = useState(false);
  const [editingType, setEditingType] = useState<ItemType | null>(null);
  const [editingModel, setEditingModel] = useState<ItemModel | null>(null);
  /** Holds the type a new model is being added to — the form opens with it preselected. */
  const [addingModelTo, setAddingModelTo] = useState<string | null>(null);
  /**
   * Holds what new equipment is being preselected into — a category (+ an
   * optional model) from the categories tree, or a project from the projects
   * list below it. The form opens with whichever of these is given filled in.
   */
  const [addingItemTo, setAddingItemTo] = useState<{
    typeId?: string;
    modelId?: string;
    projectId?: string;
  } | null>(null);
  /** Set by the card-foot button, which adds equipment without preselecting anything. */
  const [creatingItem, setCreatingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const [actionError, setActionError] = useState<DeleteFailure | null>(null);
  const [viewingItems, setViewingItems] = useState<DeleteFailure | null>(null);
  /** Categories are an admin concern, not how this page is browsed — collapsed by default. */
  const [showCategories, setShowCategories] = useState(false);

  const typeRows = types.data ?? [];
  const modelsByType = useMemo(() => {
    const buckets = new Map<string, ItemModel[]>();
    for (const model of models.data ?? []) {
      const bucket = buckets.get(model.type_id);
      if (bucket) bucket.push(model);
      else buckets.set(model.type_id, [model]);
    }
    return buckets;
  }, [models.data]);

  const itemsByModel = useMemo(() => {
    const buckets = new Map<string, Item[]>();
    for (const item of items.data ?? []) {
      if (!item.model_id) continue;
      const bucket = buckets.get(item.model_id);
      if (bucket) bucket.push(item);
      else buckets.set(item.model_id, [item]);
    }
    return buckets;
  }, [items.data]);

  // Equipment linked straight to a category, with no model picked.
  const unmodeledItemsByType = useMemo(() => {
    const buckets = new Map<string, Item[]>();
    for (const item of items.data ?? []) {
      if (item.model_id) continue;
      const bucket = buckets.get(item.type_id);
      if (bucket) bucket.push(item);
      else buckets.set(item.type_id, [item]);
    }
    return buckets;
  }, [items.data]);

  const projectRows = shell.projects.data ?? [];
  const projectsById = useMemo(
    () => new Map(projectRows.map((p) => [p.id, p])),
    [projectRows],
  );

  const itemsByProject = useMemo(() => {
    const buckets = new Map<string, Item[]>();
    for (const item of items.data ?? []) {
      const bucket = buckets.get(item.project_id);
      if (bucket) bucket.push(item);
      else buckets.set(item.project_id, [item]);
    }
    return buckets;
  }, [items.data]);

  /** One set for every level — type, model and project ids never collide. */
  const [open, setOpen] = useState<Set<string>>(new Set());
  function toggleOpen(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  async function removeType(row: ItemType) {
    if (!confirm(t.common.confirmDelete)) return;
    setActionError(null);
    try {
      await api.itemTypes.remove(row.id);
      types.reload();
      models.reload();
    } catch (err) {
      setActionError({ id: row.id, name: row.name, message: (err as Error).message, scope: "type" });
    }
  }

  async function removeModel(row: ItemModel) {
    if (!confirm(t.common.confirmDelete)) return;
    setActionError(null);
    try {
      await api.itemModels.remove(row.id);
      models.reload();
    } catch (err) {
      setActionError({
        id: row.id,
        name: row.name,
        message: (err as Error).message,
        scope: "model",
      });
    }
  }

  /** A saved model may have been moved to another type — open both ends so it stays in view. */
  function afterModelSaved(typeId: string) {
    setAddingModelTo(null);
    setEditingModel(null);
    setOpen((prev) => new Set(prev).add(typeId));
    models.reload();
  }

  async function removeItem(item: Item) {
    if (!confirm(t.common.confirmDelete)) return;
    setActionError(null);
    try {
      await api.items.remove(item.id);
      // Deleting equipment takes its loans with it, so this also moves the sidebar counts.
      shell.reloadAll();
    } catch (err) {
      setActionError({
        id: item.id,
        name: item.serial_id ?? t.equipment.noSerial,
        message: (err as Error).message,
      });
    }
  }

  function closeItemForm() {
    setCreatingItem(false);
    setAddingItemTo(null);
    setEditingItem(null);
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{t.equipmentPage.title}</h1>
          <p className="subtitle">{t.equipmentPage.subtitle}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreatingItem(true)}>
          + {t.equipment.new}
        </button>
      </header>

      {types.error && <ErrorBanner error={types.error} onRetry={types.reload} />}
      {models.error && <ErrorBanner error={models.error} onRetry={models.reload} />}
      {items.error && <ErrorBanner error={items.error} onRetry={items.reload} />}
      <DeleteError failure={actionError} onShowItems={setViewingItems} />
      {(types.loading || models.loading || items.loading) && <Spinner />}

      <div className="list-card">
        <div className="list-card-head">
          <span>{t.equipmentPage.projectsTitle}</span>
          <span className="count num">{t.equipmentPage.entries(projectRows.length)}</span>
        </div>

        {projectRows.length === 0 && <EmptyState message={t.equipmentPage.noProjectsYet} />}

        {projectRows.map((project) => {
          const projectItems = itemsByProject.get(project.id) ?? [];
          const expanded = open.has(project.id);

          return (
            <div key={project.id}>
              <div className="group-head">
                <button
                  type="button"
                  className="group-toggle"
                  aria-expanded={expanded}
                  onClick={() => toggleOpen(project.id)}
                >
                  <span className="chevron" aria-hidden="true">
                    {expanded ? "▾" : "▸"}
                  </span>
                  <span>{project.name}</span>
                  <span className="group-count">{t.equipment.unitCount(projectItems.length)}</span>
                </button>
                {project.status !== "active" && (
                  <div style={{ paddingInlineEnd: 18 }}>
                    <Pill tone="grey">{t.projects.statusLabels[project.status]}</Pill>
                  </div>
                )}
              </div>

              {expanded && (
                <>
                  {projectItems.length === 0 && (
                    <p className="group-empty">{t.equipmentPage.emptyForProject}</p>
                  )}
                  {projectItems.map((item) => (
                    <ListRow
                      key={item.id}
                      deep
                      name={itemLabel(item)}
                      meta={item.serial_id ?? undefined}
                      onEdit={() => setEditingItem(item)}
                      onDelete={() => removeItem(item)}
                    />
                  ))}
                  {project.status !== "archived" && (
                    <div className="group-foot">
                      <button
                        className="link-btn"
                        onClick={() => setAddingItemTo({ projectId: project.id })}
                      >
                        + {t.equipmentPage.addItemToProject}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <button type="button" className="link-btn" onClick={() => setShowCategories((v) => !v)}>
        {showCategories ? t.equipmentPage.hideCategories : t.equipmentPage.manageCategories}
      </button>

      {showCategories && (
        <ListLayout
          count={typeRows.length}
          addLabel={t.itemTypes.new}
          onAdd={() => setCreatingType(true)}
        >
          {typeRows.length === 0 && !types.loading && <EmptyState message={t.itemTypes.empty} />}

          {typeRows.map((type) => {
            const typeModels = modelsByType.get(type.id) ?? [];
            const unmodeledItems = unmodeledItemsByType.get(type.id) ?? [];
            const expanded = open.has(type.id);
  
            return (
              <div key={type.id}>
                <div className="group-head">
                  <button
                    type="button"
                    className="group-toggle"
                    aria-expanded={expanded}
                    onClick={() => toggleOpen(type.id)}
                  >
                    <span className="chevron" aria-hidden="true">
                      {expanded ? "▾" : "▸"}
                    </span>
                    <span>{type.name}</span>
                    <span className="group-count">{t.itemTypes.modelCount(typeModels.length)}</span>
                  </button>
                  <div className="row-actions">
                    <button className="link-btn" onClick={() => setEditingType(type)}>
                      {t.common.edit}
                    </button>
                    <button className="link-btn danger" onClick={() => removeType(type)}>
                      {t.common.delete}
                    </button>
                  </div>
                </div>
  
                {expanded && (
                  <>
                    {unmodeledItems.map((item) => (
                      <ListRow
                        key={item.id}
                        deep
                        name={item.serial_id ?? t.equipment.noSerial}
                        meta={projectsById.get(item.project_id)?.name}
                        onEdit={() => setEditingItem(item)}
                        onDelete={() => removeItem(item)}
                      />
                    ))}
  
                    {typeModels.length === 0 && unmodeledItems.length === 0 && (
                      <p className="group-empty">{t.itemModels.emptyForType}</p>
                    )}
                    {typeModels.map((model) => {
                      const modelItems = itemsByModel.get(model.id) ?? [];
                      const modelOpen = open.has(model.id);
  
                      return (
                        <div key={model.id}>
                          <div className="group-head group-head-nested">
                            <button
                              type="button"
                              className="group-toggle"
                              aria-expanded={modelOpen}
                              onClick={() => toggleOpen(model.id)}
                            >
                              <span className="chevron" aria-hidden="true">
                                {modelOpen ? "▾" : "▸"}
                              </span>
                              <span>{model.name}</span>
                              <span className="group-count">
                                {t.equipment.unitCount(modelItems.length)}
                              </span>
                            </button>
                            <div className="row-actions">
                              <button className="link-btn" onClick={() => setEditingModel(model)}>
                                {t.common.edit}
                              </button>
                              <button className="link-btn danger" onClick={() => removeModel(model)}>
                                {t.common.delete}
                              </button>
                            </div>
                          </div>
  
                          {modelOpen && (
                            <>
                              {modelItems.length === 0 && (
                                <p className="group-empty group-empty-deep">
                                  {t.equipment.emptyForModel}
                                </p>
                              )}
                              {modelItems.map((item) => (
                                <ListRow
                                  key={item.id}
                                  deep
                                  name={item.serial_id ?? t.equipment.noSerial}
                                  meta={projectsById.get(item.project_id)?.name}
                                  onEdit={() => setEditingItem(item)}
                                  onDelete={() => removeItem(item)}
                                />
                              ))}
                              <div className="group-foot group-foot-deep">
                                <button
                                  className="link-btn"
                                  onClick={() =>
                                    setAddingItemTo({ typeId: type.id, modelId: model.id })
                                  }
                                >
                                  + {t.equipment.addToModel}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                    <div className="group-foot row-actions">
                      <button className="link-btn" onClick={() => setAddingModelTo(type.id)}>
                        + {t.itemModels.addToType}
                      </button>
                      <button
                        className="link-btn"
                        onClick={() => setAddingItemTo({ typeId: type.id })}
                      >
                        + {t.equipmentPage.addItemToType}
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </ListLayout>
      )}

      {(creatingType || editingType) && (
        <Modal
          title={editingType ? t.itemTypes.edit : t.itemTypes.new}
          onClose={() => {
            setCreatingType(false);
            setEditingType(null);
          }}
        >
          <NameOnlyForm
            label={t.itemTypes.name}
            initial={editingType?.name ?? ""}
            onSubmit={(name) =>
              editingType
                ? api.itemTypes.update(editingType.id, { name })
                : api.itemTypes.create({ name })
            }
            onSaved={() => {
              setCreatingType(false);
              setEditingType(null);
              types.reload();
            }}
            onClose={() => {
              setCreatingType(false);
              setEditingType(null);
            }}
          />
        </Modal>
      )}

      {(creatingItem || addingItemTo || editingItem) && (
        <ItemFormModal
          item={editingItem}
          defaultTypeId={addingItemTo?.typeId}
          defaultModelId={addingItemTo?.modelId}
          defaultProjectId={addingItemTo?.projectId}
          onClose={closeItemForm}
          onSaved={() => {
            closeItemForm();
            shell.reloadAll();
          }}
        />
      )}

      {(addingModelTo || editingModel) && (
        <ModelFormModal
          model={editingModel}
          defaultTypeId={addingModelTo ?? ""}
          types={typeRows}
          onClose={() => {
            setAddingModelTo(null);
            setEditingModel(null);
          }}
          onSaved={afterModelSaved}
        />
      )}

      {viewingItems && (
        <LinkedItemsModal
          title={t.equipmentPage.linkedItemsTitle(viewingItems.name)}
          filter={
            viewingItems.scope === "model"
              ? { modelId: viewingItems.id }
              : { typeId: viewingItems.id }
          }
          onClose={() => setViewingItems(null)}
        />
      )}
    </>
  );
}

/* ========================================================================
 * Shared chrome: the list card on the left, the explanatory note on the right.
 * ===================================================================== */
function ListLayout({
  count,
  addLabel,
  onAdd,
  children,
  extraAction,
}: {
  count: number;
  addLabel: string;
  onAdd: () => void;
  children: ReactNode;
  /** A second button in the card foot, beside the "add" one. */
  extraAction?: ReactNode;
}) {
  return (
    <div className="split split-settings">
      <div className="list-card">
        <div className="list-card-head">
          <span>{t.equipmentPage.listTitle}</span>
          <span className="count num">{t.equipmentPage.entries(count)}</span>
        </div>

        {children}

        <div className="list-card-foot">
          <button className="btn btn-dashed" onClick={onAdd}>
            + {addLabel}
          </button>
          {extraAction}
        </div>
      </div>

      <p className="note-card">{t.equipmentPage.note}</p>
    </div>
  );
}

function ListRow({
  name,
  meta,
  deep,
  onEdit,
  onDelete,
}: {
  name: string;
  meta?: string;
  /** Indented, for an item sitting under its model. */
  deep?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`list-row${deep ? " list-row-deep" : ""}`}>
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

/** Shared "just a name" form for adding/editing a type. */
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

/** The add/edit form for one model, opened from inside its type's group. */
function ModelFormModal({
  model,
  defaultTypeId,
  types,
  onClose,
  onSaved,
}: {
  model: ItemModel | null;
  /** Preselected type when adding from inside a type's group. */
  defaultTypeId?: string;
  types: ItemType[];
  onClose: () => void;
  onSaved: (typeId: string) => void;
}) {
  const [typeId, setTypeId] = useState(model?.type_id ?? defaultTypeId ?? "");
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
      onSaved(typeId);
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
      actionLabel={canShow ? t.equipmentPage.showLinkedItems : undefined}
      onAction={canShow ? () => onShowItems(failure) : undefined}
    />
  );
}

/**
 * Shows every item currently using a given type/model, with a link to that
 * item's project — the only place items can be edited or deleted. Used when
 * a delete is blocked, so the user can find and clear what's blocking it.
 */
function LinkedItemsModal({
  title,
  filter,
  onClose,
}: {
  title: string;
  filter: { typeId?: string; modelId?: string };
  onClose: () => void;
}) {
  const shell = useShell();
  const items = useAsync(() => api.items.list(filter), [filter.typeId, filter.modelId]);
  const projectsById = new Map((shell.projects.data ?? []).map((p) => [p.id, p]));

  return (
    <Modal title={title} onClose={onClose} wide>
      <div className="form-body single">
        {items.loading && <Spinner />}
        {items.error && <ErrorBanner error={items.error} onRetry={items.reload} />}
        {items.data && items.data.length === 0 && (
          <EmptyState message={t.equipmentPage.linkedItemsEmpty} />
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
