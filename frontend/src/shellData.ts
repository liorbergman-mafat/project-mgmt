import { createContext, useContext } from "react";
import type { AsyncState } from "./hooks";
import type { Feedback, Item, Location, ProjectSummary, User } from "./types";

/**
 * The lists the nav bar counts are built from.
 *
 * They are fetched once by the shell and shared, rather than re-fetched by
 * each screen: the projects list, the equipment items, the locations
 * directory and the feedback feed are each both a screen *and* a nav bar
 * count, so a page that mutates one calls `reload()` on it and the nav bar
 * follows along.
 */
export interface ShellData {
  /** The signed-in user, as the API returned them at sign-in. */
  user: User;
  projects: AsyncState<ProjectSummary[]>;
  items: AsyncState<Item[]>;
  locations: AsyncState<Location[]>;
  feedback: AsyncState<Feedback[]>;
  /** After a change that can touch more than one of the above (e.g. a loan). */
  reloadAll: () => void;
  /**
   * Update the session from a freshly saved user record. The settings screen
   * can edit the signed-in user, and the nav bar has to follow along.
   */
  refresh: (user: User) => void;
}

const ShellContext = createContext<ShellData | null>(null);

export const ShellProvider = ShellContext.Provider;

export function useShell(): ShellData {
  const value = useContext(ShellContext);
  if (!value) throw new Error("useShell() must be called inside the app shell");
  return value;
}
