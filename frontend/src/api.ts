import type {
  ActivityEntry,
  Contact,
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
  User,
} from "./types";

/**
 * Who the API should credit the next change to.
 *
 * The backend has no session of its own (see auth.ts), so the signed-in
 * username rides along on every request and is what the activity log records.
 * Header values have to be latin-1 and every username here is Hebrew, so it
 * goes out percent-encoded and is decoded server-side.
 */
let actor: string | null = null;

export function setApiActor(username: string | null): void {
  actor = username;
}

/**
 * Vite proxies /api to FastAPI on port 8000 (see vite.config.ts), so the
 * browser only ever talks to its own origin.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (actor) headers["X-Actor"] = encodeURIComponent(actor);

  const response = await fetch(`/api${path}`, { ...init, headers });

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
  /** Read-only: statuses are a fixed, seeded list — there is no UI to add or edit them. */
  itemStatuses: {
    list: () => request<ItemStatus[]>("/item-statuses"),
  },
  locations: {
    list: () => request<Location[]>("/locations"),
    get: (id: string) => request<Location>(`/locations/${id}`),
    create: (body: Partial<Location>) => post<Location>("/locations", body),
    update: (id: string, body: Partial<Location>) => patch<Location>(`/locations/${id}`, body),
    remove: (id: string) => del(`/locations/${id}`),
  },
  contacts: {
    list: (locationId?: string) =>
      request<Contact[]>(`/contacts${locationId ? `?location_id=${locationId}` : ""}`),
    create: (body: Record<string, unknown>) => post<Contact>("/contacts", body),
    update: (id: string, body: Record<string, unknown>) => patch<Contact>(`/contacts/${id}`, body),
    remove: (id: string) => del(`/contacts/${id}`),
  },
  items: {
    list: (params?: {
      projectId?: string;
      locationId?: string;
      typeId?: string;
      modelId?: string;
      statusId?: string;
    }) => {
      const query = new URLSearchParams();
      if (params?.projectId) query.set("project_id", params.projectId);
      if (params?.locationId) query.set("location_id", params.locationId);
      if (params?.typeId) query.set("type_id", params.typeId);
      if (params?.modelId) query.set("model_id", params.modelId);
      if (params?.statusId) query.set("status_id", params.statusId);
      const qs = query.toString();
      return request<Item[]>(`/items${qs ? `?${qs}` : ""}`);
    },
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
  auth: {
    /** Throws with the server's Hebrew message when the pair is refused. */
    login: (username: string, password: string) =>
      post<User>("/auth/login", { username, password }),
  },
  users: {
    list: () => request<User[]>("/users"),
    create: (body: Record<string, unknown>) => post<User>("/users", body),
    update: (id: string, body: Record<string, unknown>) => patch<User>(`/users/${id}`, body),
    /** Sets the password outright — there is no "current password" step. */
    setPassword: (id: string, password: string) =>
      post<User>(`/users/${id}/password`, { password }),
    remove: (id: string) => del(`/users/${id}`),
  },
  /** Read-only: entries are written by the API itself, never by a screen. */
  activity: {
    list: (limit?: number) => request<ActivityEntry[]>(`/activity${limit ? `?limit=${limit}` : ""}`),
  },
};
