// TEMPORARY preview harness — not part of the app, and not typechecked by
// `tsc -b` (which only covers src/).
//
// Serves the real UI against static data so every screen can be reviewed
// without a backend or Supabase:
//
//     npx vite --config vite.preview.config.ts
//
// Reads work; writes reject, so the forms show their error path rather than
// pretending to save. Delete this file, vite.preview.config.ts and
// preview-locations.json when you are done looking.
import locationRows from "./preview-locations.json";
import type {
  Feedback,
  Item,
  Loan,
  Location,
  ProjectDetail,
  ProjectSummary,
} from "./src/types";

const readOnly = async (): Promise<never> => {
  throw new Error("תצוגה מקדימה בלבד — אין שרת מחובר.");
};

const NOW = Date.now();
const day = 86_400_000;
const iso = (daysAgo: number) => new Date(NOW - daysAgo * day).toISOString();

/* ---------------------------------------------------------------- lookups */
const types = [
  { id: "ty-1", name: "קשר", created_at: iso(300) },
  { id: "ty-2", name: "מחשוב", created_at: iso(300) },
  { id: "ty-3", name: "ניווט", created_at: iso(300) },
];

const models = [
  { id: "mo-1", type_id: "ty-1", name: "MR-3", created_at: iso(300) },
  { id: "mo-2", type_id: "ty-1", name: "MR-5", created_at: iso(300) },
  { id: "mo-3", type_id: "ty-2", name: "רגד", created_at: iso(300) },
  { id: "mo-4", type_id: "ty-3", name: "NV-7", created_at: iso(300) },
];

const statuses = [
  { id: "st-1", name: "בשימוש", created_at: iso(300) },
  { id: "st-2", name: "במחסן", created_at: iso(300) },
  { id: "st-3", name: "בתחזוקה", created_at: iso(300) },
];

/* -------------------------------------------------------------- locations */
// The real 241-unit list, with contact details filled in on the handful the
// mock items and loans point at, plus one warehouse.
const CONTACTS: Record<string, [string, string]> = {
  "id-0": ["רס״ר יואב מרום", "052-4417702"],
  "id-1": ["סמ״ר דן ניסים", "053-8820164"],
  "id-2": ["רס״ן איתי משה", "050-6631298"],
  "id-3": ["רס״ן נועם ברק", "054-7710093"],
};

const locations: Location[] = [
  ...(locationRows as Location[]).map((row) =>
    CONTACTS[row.id]
      ? { ...row, contact_name: CONTACTS[row.id][0], contact_phone: CONTACTS[row.id][1] }
      : row,
  ),
  {
    id: "id-w1",
    name: "מחסן מרכזי",
    kind: "מחסן",
    category: "כלל צה״לי",
    brigade: null,
    battalion: null,
    contact_name: "רס״ן אלון כהן",
    contact_phone: "052-3344190",
    notes: null,
    created_at: iso(300),
  },
];

const byId = new Map(locations.map((row) => [row.id, row]));

/* --------------------------------------------------------------- projects */
type Row = [string, string, string, ProjectSummary["status"], number, number, number];

const PROJECT_ROWS: Row[] = [
  ["p-1", "מבצע נושמת", "הטמעת מערכות קשר בגדוד קחצ״ר", "active", 5, 3, 3],
  ["p-2", "פרויקט רקיע", "ניסוי ציוד ניווט ביחידות המוסף", "active", 2, 1, 1],
  ["p-3", "מסע ארוך", "הטמעת עמדות מחשוב במפ״ק וביחידותיו", "active", 1, 1, 1],
  ["p-4", "מחלף כחול", "פיילוט מחשבי רגד ביחידות ההטמעה", "active", 0, 0, 0],
  ["p-5", "פרויקט צוק", "החזרת ציוד קשר למחסן בסיום", "completed", 0, 0, 1],
  ["p-6", "תום", "הטמעת ניווט בין רצועות", "archived", 0, 0, 0],
];

const projects: ProjectSummary[] = PROJECT_ROWS.map(
  ([id, name, description, status, loan_count, open_loan_count, feedback_count]) => ({
    id,
    name,
    description,
    status,
    created_at: iso(120),
    updated_at: iso(3),
    loan_count,
    open_loan_count,
    feedback_count,
  }),
);

/* ------------------------------------------------------------------ items */
function item(
  id: string,
  projectId: string,
  typeId: string,
  modelId: string,
  serial: string,
  statusId: string,
  locationId: string,
  updatedDaysAgo: number,
): Item {
  return {
    id,
    project_id: projectId,
    type_id: typeId,
    model_id: modelId,
    serial_id: serial,
    status_id: statusId,
    location_id: locationId,
    created_at: iso(90),
    updated_at: iso(updatedDaysAgo),
    type: types.find((row) => row.id === typeId) ?? null,
    model: models.find((row) => row.id === modelId) ?? null,
    status: statuses.find((row) => row.id === statusId) ?? null,
    location: byId.get(locationId) ?? null,
  };
}

const items: Item[] = [
  item("it-1", "p-1", "ty-1", "mo-1", "MR3-00841", "st-1", "id-0", 3),
  item("it-2", "p-1", "ty-1", "mo-1", "MR3-00842", "st-1", "id-0", 3),
  item("it-3", "p-1", "ty-1", "mo-1", "MR3-00907", "st-2", "id-w1", 7),
  item("it-4", "p-1", "ty-2", "mo-3", "RGD-1123", "st-3", "id-w1", 0),
  item("it-5", "p-1", "ty-3", "mo-4", "NV7-0221", "st-1", "id-1", 5),
  item("it-6", "p-1", "ty-1", "mo-2", "MR5-00915", "st-1", "id-1", 12),
  item("it-7", "p-2", "ty-3", "mo-4", "NV7-0308", "st-1", "id-3", 9),
  item("it-8", "p-3", "ty-2", "mo-3", "RGD-1187", "st-1", "id-2", 6),
];

/* ------------------------------------------------------------------ loans */
function loan(
  id: string,
  projectId: string,
  itemId: string,
  locationId: string,
  quantity: number,
  status: Loan["status"],
  loanedDaysAgo: number,
  returnedDaysAgo: number | null,
  notes: string | null,
): Loan {
  return {
    id,
    project_id: projectId,
    item_id: itemId,
    location_id: locationId,
    quantity,
    status,
    loaned_at: iso(loanedDaysAgo),
    returned_at: returnedDaysAgo === null ? null : iso(returnedDaysAgo),
    notes,
    created_at: iso(loanedDaysAgo),
    updated_at: iso(1),
    item: items.find((row) => row.id === itemId) ?? null,
    location: byId.get(locationId) ?? null,
  };
}

const loans: Loan[] = [
  loan("ln-1", "p-1", "it-1", "id-0", 4, "loaned", 54, null, "נמסר לרס״ר בפגישת התיאום בבקיר."),
  loan("ln-2", "p-1", "it-6", "id-1", 2, "loaned", 44, null, null),
  loan("ln-3", "p-1", "it-5", "id-1", 1, "loaned", 24, null, null),
  loan("ln-4", "p-1", "it-4", "id-2", 3, "returned", 68, 40, null),
  loan("ln-5", "p-1", "it-2", "id-0", 6, "returned", 97, 50, null),
  loan("ln-6", "p-2", "it-7", "id-3", 1, "loaned", 30, null, null),
  loan("ln-7", "p-3", "it-8", "id-2", 2, "loaned", 40, null, null),
];

/* --------------------------------------------------------------- feedback */
function feedbackRow(
  id: string,
  projectId: string,
  loanId: string | null,
  locationId: string,
  rating: number | null,
  daysAgo: number,
  content: string,
): Feedback {
  return {
    id,
    project_id: projectId,
    loan_id: loanId,
    location_id: locationId,
    rating,
    content,
    feedback_at: iso(daysAgo),
    created_at: iso(daysAgo),
    location: byId.get(locationId) ?? null,
    loan: loans.find((row) => row.id === loanId) ?? null,
  };
}

const feedback: Feedback[] = [
  feedbackRow("fb-1", "p-1", "ln-1", "id-0", 4, 1, "המכשירים עובדים טוב בתרגיל. הסוללות נגמרות מהר יותר משציפינו מהמפרט."),
  feedbackRow("fb-2", "p-1", "ln-3", "id-1", 5, 4, "היחידה נהנתה מהפתרון. פתר את בעיות הקליטה בשטח הבנוי, ללא תקלות עד כה."),
  feedbackRow("fb-3", "p-3", "ln-7", "id-2", 2, 7, "עמדות המחשוב הותקנו במפ״ק, אך המסרים חוזרים חלקיים ומתעכבים. העבודה איתן לא מעשית."),
  feedbackRow("fb-4", "p-2", "ln-6", "id-3", 3, 9, "נדרשת הדרכה נוספת לצוותים החדשים לפני התרגיל הבא. הממשק לא ברור מספיק."),
  feedbackRow("fb-5", "p-1", null, "id-0", 4, 12, "ההתקנה עצמה עברה חלק, אבל חסר לנו מסמך שימוש מעודכן לכלל המפעילים."),
  feedbackRow("fb-6", "p-5", null, "id-w1", null, 21, "הציוד חזר למחסן מלא ותקין לפי הרשימה. שני מכשירים נדרשים לבדיקה לפני הקצאה מחדש."),
];

/* ------------------------------------------------------------------- api */
const detail = (id: string): ProjectDetail => ({
  project: projects.find((row) => row.id === id)!,
  items: items.filter((row) => row.project_id === id),
  loans: loans.filter((row) => row.project_id === id),
  feedback: feedback.filter((row) => row.project_id === id),
});

export const api = {
  projects: {
    list: async () => projects,
    get: async (id: string) => projects.find((row) => row.id === id)!,
    detail: async (id: string) => detail(id),
    create: readOnly,
    update: readOnly,
    archive: readOnly,
    unarchive: readOnly,
    remove: readOnly,
  },
  itemTypes: { list: async () => types, create: readOnly, update: readOnly, remove: readOnly },
  itemModels: {
    list: async (typeId?: string) =>
      typeId ? models.filter((row) => row.type_id === typeId) : models,
    create: readOnly,
    update: readOnly,
    remove: readOnly,
  },
  itemStatuses: { list: async () => statuses, create: readOnly, update: readOnly, remove: readOnly },
  locations: {
    list: async () => locations,
    get: async (id: string) => byId.get(id)!,
    create: readOnly,
    update: readOnly,
    remove: readOnly,
  },
  items: {
    list: async (params?: { projectId?: string; locationId?: string }) =>
      items.filter(
        (row) =>
          (!params?.projectId || row.project_id === params.projectId) &&
          (!params?.locationId || row.location_id === params.locationId),
      ),
    create: readOnly,
    update: readOnly,
    remove: readOnly,
  },
  loans: {
    list: async (projectId?: string) =>
      projectId ? loans.filter((row) => row.project_id === projectId) : loans,
    create: readOnly,
    update: readOnly,
    markReturned: readOnly,
    remove: readOnly,
  },
  feedback: {
    list: async (projectId?: string) =>
      projectId ? feedback.filter((row) => row.project_id === projectId) : feedback,
    create: readOnly,
    remove: readOnly,
  },
};
