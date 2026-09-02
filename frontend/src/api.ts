import { supabase } from "./supabase";
import type {
  ActivityEntry,
  AllowedUser,
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
} from "./types";

/**
 * In dev, Vite proxies /api to FastAPI on port 8000 (see vite.config.ts), so
 * the browser only ever talks to its own origin. In a deployed build, set
 * VITE_API_BASE_URL to the backend, e.g. https://loan-manager-api.onrender.com/api
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Every request carries the Supabase access token; the backend rejects any
  // call without a valid one whose account is on the allowlist.
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (response.status === 401 && path !== "/me") {
    // A 401 on a normal call means the session expired mid-use — drop it so the
    // app returns to /login. `/me` is the post-sign-in allowlist probe;
    // auth.ts decides what a failure there means (a "not authorized" screen),
    // and tearing the session down here would just loop back to sign-in.
    await supabase.auth.signOut();
  }

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
  auth: {
    /** Resolves if the signed-in account is on the allowlist; rejects (403) otherwise. */
    me: () =>
      request<{ id: string; email: string; name: string; is_admin: boolean }>("/me"),
  },
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
  /** Read-only: entries are written by the API itself, never by a screen. */
  activity: {
    list: (limit?: number) => request<ActivityEntry[]>(`/activity${limit ? `?limit=${limit}` : ""}`),
  },
  /** The authorization allowlist. Admin-only end to end (the API enforces it). */
  access: {
    list: () => request<AllowedUser[]>("/allowed-users"),
    add: (body: { email: string; is_admin?: boolean; note?: string | null }) =>
      post<AllowedUser>("/allowed-users", body),
    update: (email: string, body: { is_admin?: boolean; note?: string | null }) =>
      patch<AllowedUser>(`/allowed-users/${encodeURIComponent(email)}`, body),
    remove: (email: string) => del(`/allowed-users/${encodeURIComponent(email)}`),
  },
};
