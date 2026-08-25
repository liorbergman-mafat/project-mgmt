import { createContext, useContext } from "react";
import type { AsyncState } from "./hooks";
import type { Feedback, Location, ProjectSummary } from "./types";

/**
 * The three lists the sidebar counts are built from.
 *
 * They are fetched once by the shell and shared, rather than re-fetched by
 * each screen: the projects list, the locations directory and the feedback
 * feed are each both a screen *and* a sidebar count, so a page that mutates
 * one calls `reload()` on it and the sidebar follows along.
 */
export interface ShellData {
  user: string;
  projects: AsyncState<ProjectSummary[]>;
  locations: AsyncState<Location[]>;
  feedback: AsyncState<Feedback[]>;
  /** After a change that can touch more than one of the three (e.g. a loan). */
  reloadAll: () => void;
}

const ShellContext = createContext<ShellData | null>(null);

export const ShellProvider = ShellContext.Provider;

export function useShell(): ShellData {
  const value = useContext(ShellContext);
  if (!value) throw new Error("useShell() must be called inside the app shell");
  return value;
}
