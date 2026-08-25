import { itemLabel } from "./i18n";
import type { Feedback, Item, Loan, Location } from "./types";

/**
 * The per-location numbers the locations directory shows.
 *
 * `GET /api/locations` returns the location rows and nothing else, so these
 * are folded together in the browser from the items, loans and feedback the
 * app already has. That is the trade the README calls out: one extra pass
 * over three lists here, instead of a new aggregate endpoint on the API. If
 * these lists ever outgrow a single fetch, this is the piece to move server-side.
 */
export interface LocationStats {
  itemCount: number;
  openLoans: number;
  overdue: number;
  /** What is here, by type + model, commonest first. */
  stock: { label: string; count: number }[];
  lastFeedback: Feedback | null;
}

const EMPTY: LocationStats = {
  itemCount: 0,
  openLoans: 0,
  overdue: 0,
  stock: [],
  lastFeedback: null,
};

export function emptyStats(): LocationStats {
  return EMPTY;
}

export function buildLocationStats(
  items: Item[],
  loans: Loan[],
  feedback: Feedback[],
): Map<string, LocationStats> {
  const stats = new Map<string, LocationStats>();
  const stockCounts = new Map<string, Map<string, number>>();

  const bucket = (locationId: string): LocationStats => {
    let entry = stats.get(locationId);
    if (!entry) {
      entry = { itemCount: 0, openLoans: 0, overdue: 0, stock: [], lastFeedback: null };
      stats.set(locationId, entry);
    }
    return entry;
  };

  for (const item of items) {
    bucket(item.location_id).itemCount += 1;

    let counts = stockCounts.get(item.location_id);
    if (!counts) {
      counts = new Map();
      stockCounts.set(item.location_id, counts);
    }
    const label = itemLabel(item);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  for (const loan of loans) {
    const entry = bucket(loan.location_id);
    if (loan.status === "loaned") entry.openLoans += 1;
    if (loan.is_overdue) entry.overdue += 1;
  }

  for (const entry of feedback) {
    const stat = bucket(entry.location_id);
    if (!stat.lastFeedback || entry.feedback_at > stat.lastFeedback.feedback_at) {
      stat.lastFeedback = entry;
    }
  }

  for (const [locationId, counts] of stockCounts) {
    bucket(locationId).stock = [...counts]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "he"));
  }

  return stats;
}

/** "חטיבה 1 · גדוד 12" — the location's place in the order of battle. */
export function affiliation(location: Location): string {
  return [location.brigade, location.battalion].filter(Boolean).join(" · ");
}
