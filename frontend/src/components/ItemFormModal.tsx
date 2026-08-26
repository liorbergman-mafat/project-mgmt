import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api";
import { useAsync } from "../hooks";
import { locationLabel, t } from "../i18n";
import { useShell } from "../shellData";
import { ErrorBanner, Field, FormActions, Modal, Spinner } from "./ui";
import type { Item } from "../types";

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

  const [typeId, setTypeId] = useState(item?.type_id ?? defaultTypeId ?? "");
  const [modelId, setModelId] = useState(item?.model_id ?? defaultModelId ?? "");
  const [serialId, setSerialId] = useState(item?.serial_id ?? "");
  const [projectId, setProjectId] = useState(item?.project_id ?? defaultProjectId ?? "");
  const [statusId, setStatusId] = useState(item?.status_id ?? "");
  const [locationId, setLocationId] = useState(item?.location_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const typeRows = types.data ?? [];
  const modelsForType = (models.data ?? []).filter((m) => m.type_id === typeId);
  const projects = (shell.projects.data ?? []).filter(
    // An archived project takes no new equipment, but the item being edited
    // stays listed under whichever project it already belongs to.
    (p) => p.status !== "archived" || p.id === item?.project_id,
  );
  const locations = shell.locations.data ?? [];

  const loading = types.loading || models.loading || statuses.loading;
  const listsEmpty = !loading && (typeRows.length === 0 || projects.length === 0);
  const listsError = types.error ?? models.error ?? statuses.error;

  function onTypeChange(value: string) {
    setTypeId(value);
    setModelId("");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (item) {
        await api.items.update(item.id, {
          type_id: typeId,
          model_id: modelId || null,
          serial_id: serialId.trim() || null,
          status_id: statusId,
          location_id: locationId,
        });
      } else {
        await api.items.create({
          project_id: projectId,
          type_id: typeId,
          model_id: modelId || null,
          serial_id: serialId.trim() || null,
        });
      }
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  const incomplete = !typeId || (item ? !statusId || !locationId : !projectId);

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
              <ErrorBanner
                error={typeRows.length === 0 ? t.projectItems.listsEmpty : t.equipment.noProjects}
              />
            </div>
          )}

          <Field label={t.projectItems.type} required>
            <select value={typeId} onChange={(e) => onTypeChange(e.target.value)} required autoFocus>
              <option value="">{t.common.none}</option>
              {typeRows.map((ty) => (
                <option key={ty.id} value={ty.id}>
                  {ty.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.projectItems.model}>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              disabled={!typeId}
            >
              <option value="">
                {typeId ? t.equipmentPage.noModel : t.projectItems.selectTypeFirst}
              </option>
              {modelsForType.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
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
            <p className="form-note span-2">{t.equipment.defaultsNote}</p>
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
