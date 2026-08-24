/**
 * All user-facing Hebrew strings live here, so the UI text is in one place
 * and the components stay free of hardcoded copy.
 */
export const t = {
  appName: "ניהול השאלות והטמעות",
  nav: {
    projects: "פרויקטים",
    settings: "הגדרות",
  },

  common: {
    add: "הוספה",
    save: "שמירה",
    cancel: "ביטול",
    delete: "מחיקה",
    edit: "עריכה",
    loading: "טוען…",
    search: "חיפוש",
    all: "הכול",
    none: "—",
    confirmDelete: "האם למחוק? הפעולה אינה הפיכה.",
    required: "שדה חובה",
    back: "חזרה",
    retry: "נסה שוב",
  },

  projects: {
    title: "פרויקטים",
    subtitle: "כל הנתונים מסודרים לפי פרויקט",
    new: "פרויקט חדש",
    name: "שם הפרויקט",
    description: "תיאור",
    status: "סטטוס",
    empty: "אין עדיין פרויקטים. צור את הראשון כדי להתחיל.",
    emptyArchived: "אין פרויקטים בארכיון.",
    archive: "העבר לארכיון",
    unarchive: "שחזר מהארכיון",
    showArchived: "הצג ארכיון",
    hideArchived: "הצג פעילים",
    statusLabels: {
      active: "פעיל",
      completed: "הושלם",
      archived: "בארכיון",
    } as const,
    stats: {
      loans: "השאלות",
      open: "פתוחות",
      overdue: "באיחור",
      feedback: "משובים",
    },
  },

  projectItems: {
    title: "פריטי הפרויקט",
    new: "פריט חדש",
    edit: "עריכת פריט",
    type: "סוג",
    model: "דגם",
    serialId: "מספר סידורי",
    status: "סטטוס",
    location: "מיקום",
    selectTypeFirst: "בחר סוג תחילה",
    empty: "טרם נוספו פריטים לפרויקט זה.",
  },

  loans: {
    title: "השאלות",
    new: "השאלה חדשה",
    item: "פריט",
    location: "מיקום",
    quantity: "כמות",
    status: "סטטוס",
    loanedAt: "תאריך השאלה",
    dueAt: "תאריך החזרה צפוי",
    returnedAt: "הוחזר בתאריך",
    notes: "הערות",
    markReturned: "סמן כהוחזר",
    overdue: "באיחור",
    empty: "לא הושאלו פריטים בפרויקט זה.",
    statusLabels: {
      loaned: "מושאל",
      returned: "הוחזר",
      lost: "אבד",
    } as const,
  },

  feedback: {
    title: "משוב",
    new: "משוב חדש",
    location: "מיקום מדווח",
    relatedLoan: "השאלה קשורה",
    generalFeedback: "משוב כללי לפרויקט",
    rating: "דירוג",
    content: "תוכן המשוב",
    at: "תאריך המשוב",
    empty: "טרם התקבל משוב בפרויקט זה.",
  },

  settings: {
    title: "הגדרות",
    subtitle: "ניהול רשימות הבחירה של המערכת",
    tabs: {
      types: "סוגים",
      models: "דגמים",
      statuses: "סטטוסים",
      locations: "מיקומים",
    },
  },

  itemTypes: {
    name: "שם הסוג",
    new: "סוג חדש",
    empty: "אין עדיין סוגים.",
  },

  itemModels: {
    name: "שם הדגם",
    type: "סוג",
    new: "דגם חדש",
    empty: "אין עדיין דגמים.",
  },

  itemStatuses: {
    name: "שם הסטטוס",
    new: "סטטוס חדש",
    empty: "אין עדיין סטטוסים.",
  },

  locations: {
    name: "שם",
    kind: "סוג מיקום",
    brigade: "חטיבה",
    battalion: "גדוד",
    contactName: "איש קשר",
    contactPhone: "טלפון",
    notes: "הערות",
    new: "מיקום חדש",
    empty: "אין עדיין מיקומים.",
  },
} as const;

const dateFormatter = new Intl.DateTimeFormat("he-IL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("he-IL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string | null | undefined): string {
  if (!value) return t.common.none;
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return t.common.none;
  return dateTimeFormatter.format(new Date(value));
}

/** "לפני 3 ימים" — used on feedback, where recency matters more than the date. */
export function formatRelative(value: string): string {
  const rtf = new Intl.RelativeTimeFormat("he-IL", { numeric: "auto" });
  const diffMs = new Date(value).getTime() - Date.now();
  const diffDays = Math.round(diffMs / 86_400_000);

  if (Math.abs(diffDays) >= 30) {
    return rtf.format(Math.round(diffDays / 30), "month");
  }
  if (Math.abs(diffDays) >= 1) {
    return rtf.format(diffDays, "day");
  }
  const diffHours = Math.round(diffMs / 3_600_000);
  if (Math.abs(diffHours) >= 1) {
    return rtf.format(diffHours, "hour");
  }
  return rtf.format(Math.round(diffMs / 60_000), "minute");
}

/** Datetime-local inputs need "YYYY-MM-DDTHH:mm" in *local* time. */
export function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** "קשר MR-3" from an item's type + model, since items no longer have their own name. */
export function itemLabel(item: { type?: { name: string } | null; model?: { name: string } | null } | null | undefined): string {
  if (!item) return t.common.none;
  return [item.type?.name, item.model?.name].filter(Boolean).join(" ") || t.common.none;
}

/** "גדוד 890 (חטיבה 1)" from a location's name + brigade, for compact display. */
export function locationLabel(location: { name: string; brigade?: string | null } | null | undefined): string {
  if (!location) return t.common.none;
  return location.brigade ? `${location.name} (${location.brigade})` : location.name;
}
