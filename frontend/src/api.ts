import type {
  Feedback,
  Item,
  ItemModel,
  ItemStatus,
  ItemType,
  Loan,
  Location,
  Project,
  ProjectDetail,
  ProjectSummary,
} from "./types";

/**
 * Vite proxies /api to FastAPI on port 8000 (see vite.config.ts), so the
 * browser only ever talks to its own origin.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!response.ok) {
    let detail = `שגיאת שרת (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") detail = body.detail;
      else if (Array.isArray(body.detail)) detail = body.detail[0]?.msg ?? detail;
    } catch {
      // Response had no JSON body — keep the generic message.
    }
    throw new Error(detail);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });

const patch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "PATCH", body: JSON.stringify(body) });

const del = (path: string) => request<void>(path, { method: "DELETE" });

export const api = {
  projects: {
    list: () => request<ProjectSummary[]>("/projects"),
    get: (id: string) => request<Project>(`/projects/${id}`),
    detail: (id: string) => request<ProjectDetail>(`/projects/${id}/detail`),
    create: (body: Partial<Project>) => post<Project>("/projects", body),
    update: (id: string, body: Partial<Project>) => patch<Project>(`/projects/${id}`, body),
    archive: (id: string) => post<Project>(`/projects/${id}/archive`),
    unarchive: (id: string) => post<Project>(`/projects/${id}/unarchive`),
    remove: (id: string) => del(`/projects/${id}`),
  },
  itemTypes: {
    list: () => request<ItemType[]>("/item-types"),
    create: (body: Partial<ItemType>) => post<ItemType>("/item-types", body),
    update: (id: string, body: Partial<ItemType>) => patch<ItemType>(`/item-types/${id}`, body),
    remove: (id: string) => del(`/item-types/${id}`),
  },
  itemModels: {
    list: (typeId?: string) =>
      request<ItemModel[]>(`/item-models${typeId ? `?type_id=${typeId}` : ""}`),
    create: (body: Partial<ItemModel>) => post<ItemModel>("/item-models", body),
    update: (id: string, body: Partial<ItemModel>) => patch<ItemModel>(`/item-models/${id}`, body),
    remove: (id: string) => del(`/item-models/${id}`),
  },
  itemStatuses: {
    list: () => request<ItemStatus[]>("/item-statuses"),
    create: (body: Partial<ItemStatus>) => post<ItemStatus>("/item-statuses", body),
    update: (id: string, body: Partial<ItemStatus>) =>
      patch<ItemStatus>(`/item-statuses/${id}`, body),
    remove: (id: string) => del(`/item-statuses/${id}`),
  },
  locations: {
    list: () => request<Location[]>("/locations"),
    create: (body: Partial<Location>) => post<Location>("/locations", body),
    update: (id: string, body: Partial<Location>) => patch<Location>(`/locations/${id}`, body),
    remove: (id: string) => del(`/locations/${id}`),
  },
  items: {
    list: (projectId?: string) =>
      request<Item[]>(`/items${projectId ? `?project_id=${projectId}` : ""}`),
    create: (body: Record<string, unknown>) => post<Item>("/items", body),
    update: (id: string, body: Record<string, unknown>) => patch<Item>(`/items/${id}`, body),
    remove: (id: string) => del(`/items/${id}`),
  },
  loans: {
    list: (projectId?: string) =>
      request<Loan[]>(`/loans${projectId ? `?project_id=${projectId}` : ""}`),
    create: (body: Record<string, unknown>) => post<Loan>("/loans", body),
    update: (id: string, body: Record<string, unknown>) => patch<Loan>(`/loans/${id}`, body),
    markReturned: (id: string) => post<Loan>(`/loans/${id}/return`),
    remove: (id: string) => del(`/loans/${id}`),
  },
  feedback: {
    list: (projectId?: string) =>
      request<Feedback[]>(`/feedback${projectId ? `?project_id=${projectId}` : ""}`),
    create: (body: Record<string, unknown>) => post<Feedback>("/feedback", body),
    remove: (id: string) => del(`/feedback/${id}`),
  },
};
