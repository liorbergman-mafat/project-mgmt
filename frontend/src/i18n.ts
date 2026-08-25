/**
 * All user-facing Hebrew strings live here, so the UI text is in one place
 * and the components stay free of hardcoded copy.
 */
export const t = {
  appName: "ניהול השאלות והטמעות",
  /** The app name broken where the sidebar wordmark wraps it. */
  appNameLines: ["ניהול השאלות", "והטמעות"],
  nav: {
    projects: "פרויקטים",
    locations: "מיקומים",
    feedback: "משוב מהיחידות",
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
    none: "—",
    confirmDelete: "האם למחוק? הפעולה אינה הפיכה.",
    required: "שדה חובה",
    back: "חזרה",
    retry: "נסה שוב",
    updated: "עודכן",
  },

  shell: {
    settings: "הגדרות",
    signOut: "יציאה",
  },

  auth: {
    title: "ניהול השאלות והטמעות",
    subtitle: "מערכת פנימית. גישה למשתמשים מורשים בלבד.",
    username: "שם משתמש",
    password: "סיסמה",
    submit: "התחברות",
    note: "כל הפעולות במערכת נרשמות ומשויכות למשתמש.",
    /** Shown under the user name in the sidebar — there is no user record to read a real role from. */
    role: "משתמש מערכת",
    missing: "יש להזין שם משתמש וסיסמה.",
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
    deleteProject: "מחק פרויקט",
    deleteConfirmTitle: "מחיקת הפרויקט",
    deleteConfirmMessage: (name: string) =>
      `למחוק את הפרויקט "${name}"? כל הפריטים, ההשאלות והמשובים שלו יימחקו לצמיתות. הפעולה אינה הפיכה.`,
    showArchived: "בארכיון",
    hideArchived: "פעילים",
    statusLabels: {
      active: "פעיל",
      completed: "הושלם",
      archived: "בארכיון",
    } as const,
    stats: {
      loans: "השאלות",
      open: "פתוחות",
      feedback: "משובים",
      /** Longer forms, for the project-detail stat strip. */
      items: "פריטים בפרויקט",
      openLoans: "השאלות פתוחות",
    },
  },

  projectItems: {
    title: "פריטי הפרויקט",
    /** The items table shows type and model in one column. */
    typeAndModel: "סוג ודגם",
    new: "פריט חדש",
    edit: "עריכת פריט",
    type: "סוג",
    model: "דגם",
    serialId: "מספר סידורי",
    status: "סטטוס",
    location: "מיקום",
    selectTypeFirst: "בחר סוג תחילה",
    empty: "טרם נוספו פריטים לפרויקט זה.",
    listsEmpty: "הרשימות עדיין ריקות — הגדר סוגים, סטטוסים ומיקומים בעמוד ״הגדרות״ תחילה.",
  },

  loans: {
    title: "השאלות",
    new: "השאלה חדשה",
    item: "פריט",
    location: "מיקום",
    quantity: "כמות",
    status: "סטטוס",
    loanedAt: "תאריך השאלה",
    returnedAt: "הוחזר בתאריך",
    notes: "הערות",
    markReturned: "סמן כהוחזר",
    empty: "לא הושאלו פריטים בפרויקט זה.",
    noItems: "אין עדיין פריטים בפרויקט זה — הוסף פריט תחילה.",
    noLocations: "אין מיקומים רשומים — הוסף מיקום בעמוד ״הגדרות״ תחילה.",
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
    unrated: "ללא דירוג",
    content: "תוכן המשוב",
    at: "תאריך המשוב",
    empty: "טרם התקבל משוב בפרויקט זה.",

    /* The cross-project feed reached from the sidebar. */
    feedTitle: "משוב מהיחידות",
    feedSubtitle: "מה שנשלח מהשטח, לפי סדר הגעה",
    feedEmpty: "טרם התקבל משוב במערכת.",
    noMatches: "אין משוב התואם לסינון.",
    filters: {
      all: "הכול",
      lowRated: "דירוג נמוך",
      thisMonth: "החודש",
      unrated: "ללא דירוג",
    },
    averageByType: "ממוצע דירוג לפי סוג ציוד",
    averageEmpty: "אין עדיין משוב מדורג.",
    monthCount: "משובים החודש",
    monthScope: (locations: number) =>
      locations === 1 ? "מיחידה אחת" : `מ־${locations} יחידות שונות`,
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
    entries: (n: number) => (n === 1 ? "רשומה אחת" : `${n} רשומות`),
    note:
      "רשימות אלו מזינות את כל שדות הבחירה בכל טופס במערכת. " +
      "מחיקת רשומה שנעשה בה שימוש תיחסם.",
    showLinkedItems: "הצג פריטים",
    linkedItemsEmpty: "לא נמצאו פריטים.",
    linkedItemsTitle: (name: string) => `פריטים המשויכים ל״${name}״`,
  },

  itemTypes: {
    name: "שם הסוג",
    new: "סוג חדש",
    edit: "עריכת סוג",
    empty: "אין עדיין סוגים.",
    modelCount: (n: number) => (n === 1 ? "דגם אחד" : `${n} דגמים`),
  },

  itemModels: {
    name: "שם הדגם",
    type: "סוג",
    new: "דגם חדש",
    edit: "עריכת דגם",
    empty: "אין עדיין דגמים.",
  },

  itemStatuses: {
    name: "שם הסטטוס",
    new: "סטטוס חדש",
    edit: "עריכת סטטוס",
    empty: "אין עדיין סטטוסים.",
  },

  locations: {
    /* The directory screen reached from the sidebar. */
    title: "מיקומים",
    subtitle: "יחידות ומחסנים — היכן שנמצא כל ציוד",
    itemCount: "פריטים",
    itemsHere: "פריטים כאן",
    openLoans: "השאלות פתוחות",
    contact: "איש קשר",
    stock: "ציוד במיקום",
    stockEmpty: "אין פריטים רשומים במיקום זה.",
    lastFeedback: "משוב אחרון",
    lastFeedbackEmpty: "טרם התקבל משוב ממיקום זה.",
    openDetail: "הצג פריטים ביחידה",
    noSelection: "בחר מיקום מהרשימה.",

    name: "שם",
    kind: "סוג מיקום",
    category: "קטגוריה",
    brigade: "חטיבה",
    battalion: "גדוד",
    contactName: "איש קשר",
    contactPhone: "טלפון",
    notes: "הערות",
    new: "מיקום חדש",
    edit: "עריכת מיקום",
    empty: "אין עדיין מיקומים.",
    noMatches: "אין מיקומים התואמים לסינון.",
    battalionCount: (n: number) => (n === 1 ? "גדוד אחד" : `${n} גדודים`),
  },

  /** The one-location screen; "unit" is what a location of kind יחידה is called. */
  units: {
    notFound: "היחידה לא נמצאה.",
    itemsTitle: "פריטים ביחידה",
    itemsEmpty: "לא נמצאו פריטים ביחידה זו.",
    project: "פרויקט",
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
