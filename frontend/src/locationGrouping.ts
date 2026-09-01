import { t } from "./i18n";
import type { Location } from "./types";

/** The option list for one filter: unique, Hebrew-sorted, blanks dropped. */
export function options(rows: Location[], pick: (row: Location) => string | null): string[] {
  const seen = new Set(rows.map(pick).filter((v): v is string => Boolean(v)));
  return [...seen].sort((a, b) => a.localeCompare(b, "he"));
}

// The fixed briefing order for categories, not alphabetical. Anything not
// listed here (a category added later) sorts after these, alphabetically.
const CATEGORY_ORDER = [
  "סדיר קחצ״ר",
  "מילואים קחצ״ר",
  "חטמ״ר",
  "שריון + אש",
  "כלל צה״לי",
  "בא״חים",
  "חיצוניים",
];

export function sortCategories(values: string[]): string[] {
  return [...values].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b, "he");
  });
}

export type BrigadeGroup = {
  key: string;
  label: string;
  /** The raw value, for sorting — `label` may carry a disambiguating category. */
  brigade: string | null;
  rows: Location[];
};

/**
 * Bucket the (already-filtered) rows by brigade, for a collapsible list —
 * with hundreds of battalions/units in a category, showing every row flat
 * makes the list unusable, so it opens fully collapsed to one row per
 * brigade instead.
 *
 * The bucket key is (category, brigade), not brigade alone — the same
 * brigade name exists under two different categories (e.g. "1- גולני" under
 * both סדיר קחצ״ר and בא״חים), and those are different organizations, not
 * one group split in two. The displayed label stays just the brigade name
 * unless that name is genuinely ambiguous in the current row set, in which
 * case the category is appended to tell the two apart.
 */
export function groupByBrigade(rows: Location[]): BrigadeGroup[] {
  const buckets = new Map<string, { category: string | null; brigade: string | null; rows: Location[] }>();
  for (const row of rows) {
    const key = `${row.category ?? ""} ${row.brigade ?? ""}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.rows.push(row);
    else buckets.set(key, { category: row.category, brigade: row.brigade, rows: [row] });
  }

  const nameOccurrences = new Map<string, number>();
  for (const { brigade } of buckets.values()) {
    const name = brigade ?? "";
    nameOccurrences.set(name, (nameOccurrences.get(name) ?? 0) + 1);
  }

  return [...buckets.entries()]
    .map(([key, { category, brigade, rows }]) => {
      const name = brigade || t.common.none;
      const ambiguous = (nameOccurrences.get(brigade ?? "") ?? 0) > 1;
      return {
        key,
        label: ambiguous && category ? `${name} (${category})` : name,
        brigade,
        rows,
      };
    })
    .sort((a, b) => compareBrigades(a.brigade, b.brigade));
}

/**
 * The directory's resting order: by brigade number, ascending — so 1- גולני,
 * 2- כרמלי, 10- הראל, not the 1/10/2 a plain string sort gives. A brigade
 * written without a number ("אפרים", "מרום") has nothing to place it in that
 * run, so those follow the numbered ones, in Hebrew order.
 */
export function compareBrigades(a: string | null, b: string | null): number {
  const left = splitUnitName(a);
  const right = splitUnitName(b);
  if (left.number && right.number) {
    const byNumber = Number(left.number) - Number(right.number);
    if (byNumber) return byNumber;
  } else if (left.number !== right.number) {
    return left.number ? -1 : 1;
  }
  return (a ?? "").localeCompare(b ?? "", "he");
}

/* ------------------------------------------------------------------------
 * Brigade / battalion names.
 *
 * The directory writes both as one string, in the shape the seed data uses:
 * number, a dash, then the name — "1- גולני", "261- בה"ד 1". Plenty of rows
 * carry only one half (the brigade "אפרים", the battalion "890"), so the
 * form asks for the two parts separately and joins them here, keeping every
 * value ever added in the same shape as the ones already in the table.
 * --------------------------------------------------------------------- */

/** Join the two halves the form asks for. Either may be blank, but not both. */
export function formatUnitName(number: string, name: string): string {
  const num = number.trim();
  const label = name.trim();
  if (num && label) return `${num}- ${label}`;
  return num || label;
}

/** The inverse, so editing an existing row shows the parts in their own fields. */
export function splitUnitName(value: string | null): { number: string; name: string } {
  const raw = (value ?? "").trim();
  const match = /^(\d+)\s*-\s*(.+)$/.exec(raw);
  if (match) return { number: match[1], name: match[2] };
  return /^\d+$/.test(raw) ? { number: raw, name: "" } : { number: "", name: raw };
}
