import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api";
import { useAsync } from "../hooks";
import { locationLabel, t } from "../i18n";
import { useShell } from "../shellData";
import { Combobox, ErrorBanner, Field, FormActions, Modal, Spinner, InfoNote } from "./ui";
import type { Item } from "../types";

/** Trimmed, case-insensitive — so "מצלמות" and " מצלמות " resolve to the same row. */
const norm = (value: string) => value.trim().toLowerCase();

/**
 * Add or edit one piece of equipment.
 *
 * Adding asks only for what identifies the equipment and who owns it:
 * category, serial number and project. Model is optional — equipment can be
 * linked straight to a category with no model. Status and location are
 * deliberately not asked for — the backend starts every new item in the
 * warehouse. Editing an existing item does show them, since that is where
 * they are changed; the project is shown but locked, because an item's loans
 * live under the project that owned it.
 */
export function ItemFormModal({
  item,
  defaultTypeId,
  defaultModelId,
  defaultProjectId,
  onClose,
  onSaved,
}: {
  /** The item being edited, or null when adding. */
  item: Item | null;
  /** Preselections when adding from somewhere that already implies them. */
  defaultTypeId?: string;
  defaultModelId?: string;
  defaultProjectId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const shell = useShell();
  const types = useAsync(() => api.itemTypes.list(), []);
  const models = useAsync(() => api.itemModels.list(), []);
  // Only the edit form has status/location fields to fill.
  const statuses = useAsync(
    () => (item ? api.itemStatuses.list() : Promise.resolve([])),
    [item?.id ?? ""],
  );

  const [typeName, setTypeName] = useState(item?.type?.name ?? "");
  const [modelName, setModelName] = useState(item?.model?.name ?? "");
  const [serialId, setSerialId] = useState(item?.serial_id ?? "");
  const [projectId, setProjectId] = useState(item?.project_id ?? defaultProjectId ?? "");
  const [statusId, setStatusId] = useState(item?.status_id ?? "");
  const [locationId, setLocationId] = useState(item?.location_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Preselecting by id (e.g. "add item to this category") only has a name to
  // show once the lookup list has loaded — resolve it once, the first time
  // each list arrives, without stomping on whatever the user has since typed.
  const resolvedTypeDefaultRef = useRef(false);
  if (!resolvedTypeDefaultRef.current && !item && defaultTypeId && types.data) {
    resolvedTypeDefaultRef.current = true;
    const match = types.data.find((ty) => ty.id === defaultTypeId);
    if (match) setTypeName(match.name);
  }
  const resolvedModelDefaultRef = useRef(false);
  if (!resolvedModelDefaultRef.current && !item && defaultModelId && models.data) {
    resolvedModelDefaultRef.current = true;
    const match = models.data.find((m) => m.id === defaultModelId);
    if (match) setModelName(match.name);
  }

  const typeRows = types.data ?? [];
  const matchedType = typeRows.find((ty) => norm(ty.name) === norm(typeName));
  const typeId = matchedType?.id ?? "";
  const modelsForType = typeId ? (models.data ?? []).filter((m) => m.type_id === typeId) : [];
  const projects = (shell.projects.data ?? []).filter(
    // An archived project takes no new equipment, but the item being edited
    // stays listed under whichever project it already belongs to.
    (p) => p.status !== "archived" || p.id === item?.project_id,
  );
  const locations = shell.locations.data ?? [];

  const loading = types.loading || models.loading || statuses.loading;
  const listsEmpty = !loading && projects.length === 0;
  const listsError = types.error ?? models.error ?? statuses.error;

  // Switching to a different existing category invalidates a model already
  // typed in (it belongs to the old category) — but don't wipe it while the
  // category text is merely mid-edit and transiently unmatched.
  const typeIdOnFocusRef = useRef(typeId);

  async function resolveTypeId(): Promise<string> {
    const name = typeName.trim();
    const existing = typeRows.find((ty) => norm(ty.name) === norm(name));
    if (existing) return existing.id;
    const created = await api.itemTypes.create({ name });
    types.reload();
    return created.id;
  }

  async function resolveModelId(resolvedTypeId: string): Promise<string | null> {
    const name = modelName.trim();
    if (!name) return null;
    const existing = (models.data ?? []).find(
      (m) => m.type_id === resolvedTypeId && norm(m.name) === norm(name),
    );
    if (existing) return existing.id;
    const created = await api.itemModels.create({ type_id: resolvedTypeId, name });
    models.reload();
    return created.id;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const resolvedTypeId = await resolveTypeId();
      const resolvedModelId = await resolveModelId(resolvedTypeId);
      if (item) {
        await api.items.update(item.id, {
          type_id: resolvedTypeId,
          model_id: resolvedModelId,
          serial_id: serialId.trim() || null,
          status_id: statusId,
          location_id: locationId,
        });
      } else {
        await api.items.create({
          project_id: projectId,
          type_id: resolvedTypeId,
          model_id: resolvedModelId,
          serial_id: serialId.trim() || null,
        });
      }
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  const incomplete = !typeName.trim() || (item ? !statusId || !locationId : !projectId);

  return (
    <Modal title={item ? t.equipment.edit : t.equipment.new} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-body">
          {loading && (
            <div className="span-2">
              <Spinner />
            </div>
          )}
          {listsError && (
            <div className="span-2">
              <ErrorBanner error={listsError} />
            </div>
          )}
          {listsEmpty && (
            <div className="span-2">
              <ErrorBanner error={t.equipment.noProjects} />
            </div>
          )}

          <Field label={t.projectItems.type} required>
            <Combobox
              id="item-type"
              value={typeName}
              onChange={(value) => setTypeName(value)}
              options={typeRows.map((ty) => ty.name)}
              required
              autoFocus
              onFocus={() => {
                typeIdOnFocusRef.current = typeId;
              }}
              onBlur={() => {
                if (typeId !== typeIdOnFocusRef.current) setModelName("");
              }}
            />
          </Field>

          <Field label={t.projectItems.model}>
            <Combobox
              id="item-model"
              value={modelName}
              onChange={setModelName}
              options={modelsForType.map((m) => m.name)}
              disabled={!typeName.trim()}
              placeholder={typeName.trim() ? t.equipmentPage.noModel : t.projectItems.selectTypeFirst}
            />
          </Field>

          <Field label={t.projectItems.serialId}>
            <input value={serialId} onChange={(e) => setSerialId(e.target.value)} />
          </Field>

          <Field label={t.equipment.project} required>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
              disabled={!!item}
            >
              <option value="">{t.common.none}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>

          {item ? (
            <>
              <Field label={t.projectItems.status} required>
                <select value={statusId} onChange={(e) => setStatusId(e.target.value)} required>
                  <option value="">{t.common.none}</option>
                  {(statuses.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={t.projectItems.location} required>
                <select value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
                  <option value="">{t.common.none}</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {locationLabel(loc)}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          ) : (
            <InfoNote>{t.equipment.defaultsNote}</InfoNote>
          )}

          {error && (
            <div className="span-2">
              <ErrorBanner error={error} />
            </div>
          )}
        </div>

        <FormActions saving={saving} disabled={incomplete} onCancel={onClose} />
      </form>
    </Modal>
  );
}
