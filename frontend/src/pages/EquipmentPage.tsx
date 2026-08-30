import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAsync } from "../hooks";
import { itemLabel, locationLabel, t } from "../i18n";
import { useShell } from "../shellData";
import { ItemFormModal } from "../components/ItemFormModal";
import { ChevronStart, EquipmentIcon } from "../components/icons";
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

/** What is queued for deletion, and which endpoint takes it. */
type Pending =
  | { kind: "type"; row: ItemType }
  | { kind: "model"; row: ItemModel }
  | { kind: "item"; row: Item };

/**
 * Equipment — the catalogue on one side, the actual pieces of equipment on
 * the other. Picking a category on the left fills the table on the right with
 * every item registered under it, models and un-modelled alike.
 *
 * Types and models share this page because a model means nothing without its
 * type; the items sit beside them because a serial number means nothing
 * without its model.
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
  /** Holds the category (+ optional model) new equipment is being preselected into. */
  const [addingItemTo, setAddingItemTo] = useState<{
    typeId?: string;
    modelId?: string;
  } | null>(null);
  /** Set by the header button, which adds equipment without preselecting anything. */
  const [creatingItem, setCreatingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const [pending, setPending] = useState<Pending | null>(null);
  const [actionError, setActionError] = useState<DeleteFailure | null>(null);
  const [viewingItems, setViewingItems] = useState<DeleteFailure | null>(null);

  const typeRows = types.data ?? [];
  const itemRows = items.data ?? [];

  const modelsByType = useMemo(() => {
    const buckets = new Map<string, ItemModel[]>();
    for (const model of models.data ?? []) {
      const bucket = buckets.get(model.type_id);
      if (bucket) bucket.push(model);
      else buckets.set(model.type_id, [model]);
    }
    return buckets;
  }, [models.data]);

  const itemsByType = useMemo(() => {
    const buckets = new Map<string, Item[]>();
    for (const item of itemRows) {
      const bucket = buckets.get(item.type_id);
      if (bucket) bucket.push(item);
      else buckets.set(item.type_id, [item]);
    }
    return buckets;
  }, [itemRows]);

  const itemsByModel = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of itemRows) {
      if (item.model_id) counts.set(item.model_id, (counts.get(item.model_id) ?? 0) + 1);
    }
    return counts;
  }, [itemRows]);

  const projectsById = useMemo(
    () => new Map((shell.projects.data ?? []).map((p) => [p.id, p])),
    [shell.projects.data],
  );

  // The selected category drives the table beside the list. It falls back to
  // the first category whenever the current pick disappears (deleted, or the
  // list has not landed yet).
  const [typeId, setTypeId] = useState<string | null>(null);
  const selectedType =
    typeRows.find((row) => row.id === typeId) ?? typeRows[0] ?? null;
  const selectedItems = selectedType ? (itemsByType.get(selectedType.id) ?? []) : [];

  async function runDelete(target: Pending) {
    setActionError(null);
    try {
      if (target.kind === "type") {
        await api.itemTypes.remove(target.row.id);
        types.reload();
        models.reload();
      } else if (target.kind === "model") {
        await api.itemModels.remove(target.row.id);
        models.reload();
      } else {
        await api.items.remove(target.row.id);
        // Deleting equipment takes its loans with it, so this also moves the
        // nav counts.
        shell.reloadAll();
      }
      setPending(null);
    } catch (err) {
      setPending(null);
      setActionError({
        id: target.row.id,
        name:
          target.kind === "item"
            ? (target.row.serial_id ?? t.equipment.noSerial)
            : target.row.name,
        message: (err as Error).message,
        scope: target.kind === "item" ? undefined : target.kind,
      });
    }
  }

  /** A saved model may have been moved to another type — follow it there. */
  function afterModelSaved(savedTypeId: string) {
    setAddingModelTo(null);
    setEditingModel(null);
    setTypeId(savedTypeId);
    models.reload();
  }

  function closeItemForm() {
    setCreatingItem(false);
    setAddingItemTo(null);
    setEditingItem(null);
  }

  const loading = types.loading || models.loading || items.loading;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{t.equipmentPage.title}</h1>
          <p className="subtitle">{t.equipmentPage.subtitle}</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setCreatingItem(true)}>
            + {t.equipment.new}
          </button>
        </div>
      </header>

      {types.error && <ErrorBanner error={types.error} onRetry={types.reload} />}
      {models.error && <ErrorBanner error={models.error} onRetry={models.reload} />}
      {items.error && <ErrorBanner error={items.error} onRetry={items.reload} />}
      <DeleteError failure={actionError} onShowItems={setViewingItems} />
      {loading && <Spinner />}

      {!loading && typeRows.length === 0 && (
        <EmptyState
          message={t.itemTypes.empty}
          icon={<EquipmentIcon size={19} />}
          action={
            <button className="btn btn-secondary btn-sm" onClick={() => setCreatingType(true)}>
              + {t.itemTypes.new}
            </button>
          }
        />
      )}

      {typeRows.length > 0 && (
        <div className="split split-equipment">
          {/* --- The catalogue: every category, its models under it. --- */}
          <div className="card cat-card">
            <div className="card-head">
              <span className="title quiet">{t.equipmentPage.listTitle}</span>
              <span className="count num">{t.common.records(typeRows.length)}</span>
            </div>

            <div className="cat-body">
              {typeRows.map((type) => {
                const typeModels = modelsByType.get(type.id) ?? [];
                const on = selectedType?.id === type.id;

                return (
                  <div className="cat-group" key={type.id}>
                    <button
                      type="button"
                      className={`cat-row${on ? " on" : ""}`}
                      aria-pressed={on}
                      onClick={() => setTypeId(type.id)}
                    >
                      <span className="chevron" aria-hidden="true">
                        <ChevronStart />
                      </span>
                      <span className="name">{type.name}</span>
                      <span className="count num">
                        {(itemsByType.get(type.id) ?? []).length}
                      </span>
                    </button>

                    {/* The models of the open category only — the whole tree
                        at once is unreadable once there are more than a few. */}
                    {on && (
                      <div className="cat-models">
                        {typeModels.length === 0 && (
                          <p className="muted small">{t.itemModels.emptyForType}</p>
                        )}
                        {typeModels.map((model) => (
                          <div className="model-row" key={model.id}>
                            <span className="dot" aria-hidden="true" />
                            <span className="name">{model.name}</span>
                            <span className="count num">{itemsByModel.get(model.id) ?? 0}</span>
                            <button
                              className="link-btn"
                              onClick={() => setEditingModel(model)}
                              aria-label={`${t.common.edit} ${model.name}`}
                            >
                              {t.common.edit}
                            </button>
                            <button
                              className="link-btn danger"
                              onClick={() => setPending({ kind: "model", row: model })}
                              aria-label={`${t.common.delete} ${model.name}`}
                            >
                              {t.common.delete}
                            </button>
                          </div>
                        ))}

                        <div className="cat-actions">
                          <button className="link-btn" onClick={() => setAddingModelTo(type.id)}>
                            + {t.itemModels.addToType}
                          </button>
                          <button
                            className="link-btn"
                            onClick={() => setAddingItemTo({ typeId: type.id })}
                          >
                            + {t.equipmentPage.addItemToType}
                          </button>
                          <button className="link-btn" onClick={() => setEditingType(type)}>
                            {t.common.edit}
                          </button>
                          <button
                            className="link-btn danger"
                            onClick={() => setPending({ kind: "type", row: type })}
                          >
                            {t.common.delete}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <button className="link-btn" onClick={() => setCreatingType(true)}>
                + {t.itemTypes.new}
              </button>
            </div>

            <p className="card-foot">{t.equipmentPage.note}</p>
          </div>

          {/* --- What is actually registered under the open category. --- */}
          <div className="table-card main-pane">
            <div className="card-head">
              <span className="title">
                {t.equipmentPage.linkedItemsTitle(selectedType?.name ?? t.common.none)}
              </span>
              <span className="count num">{t.equipment.unitCount(selectedItems.length)}</span>
            </div>

            {selectedItems.length === 0 ? (
              <div className="card-body-empty">
                <p className="muted small">{t.equipmentPage.linkedItemsEmpty}</p>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setAddingItemTo({ typeId: selectedType?.id })}
                >
                  + {t.equipment.new}
                </button>
              </div>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{t.projectItems.typeAndModel}</th>
                      <th>{t.projectItems.serialId}</th>
                      <th>{t.units.project}</th>
                      <th>{t.projectItems.status}</th>
                      <th>{t.projectItems.location}</th>
                      <th className="shrink" />
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.map((item) => (
                      <tr key={item.id}>
                        <td className="strong">{itemLabel(item)}</td>
                        <td className="ltr muted">{item.serial_id ?? t.common.none}</td>
                        <td>{projectsById.get(item.project_id)?.name ?? t.common.none}</td>
                        <td>
                          <Pill tone={ITEM_STATUS_TONE[item.status?.name ?? ""] ?? "grey"}>
                            {item.status?.name ?? t.common.none}
                          </Pill>
                        </td>
                        <td>{locationLabel(item.location)}</td>
                        <td className="actions">
                          <div className="row-actions">
                            <button className="link-btn" onClick={() => setEditingItem(item)}>
                              {t.common.edit}
                            </button>
                            <button
                              className="link-btn danger"
                              onClick={() => setPending({ kind: "item", row: item })}
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
            )}
          </div>
        </div>
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

      {pending && (
        <ConfirmModal
          title={t.common.delete}
          message={t.common.confirmDelete}
          onClose={() => setPending(null)}
          onConfirm={() => runDelete(pending)}
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
