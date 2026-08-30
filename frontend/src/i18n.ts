/**
 * All user-facing Hebrew strings live here, so the UI text is in one place
 * and the components stay free of hardcoded copy.
 */
export const t = {
  appName: "חברון",
  nav: {
    projects: "פרויקטים",
    equipment: "ציוד",
    locations: "מיקומים",
    feedback: "משוב מהיחידות",
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
    open: "פתח",
    /** How many rows a list card holds, shown in its header strip. */
    records: (n: number) => (n === 1 ? "רשומה אחת" : `${n} רשומות`),
    /** Split around the asterisk, so the marker itself can be coloured. */
    requiredNote: "שדות המסומנים ב־",
    requiredNoteTail: "הם שדות חובה",
  },

  shell: {
    signOut: "יציאה",
    /** The parent organisation's mark in the far corner of the top bar. */
    parentOrg: "מנחת AI&Autonomy",
  },

  auth: {
    title: "ניהול השאלות והטמעות",
    subtitle: "מערכת פנימית. גישה למשתמשים מורשים בלבד.",
    username: "שם משתמש",
    password: "סיסמה",
    submit: "התחברות",
    note: "כל הפעולות במערכת נרשמות ומשויכות למשתמש.",
    /** The avatar's tooltip — there is no user record to read a real role from. */
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
    empty: "אין עדיין פרויקטים.",
    emptyHint: "צור את הראשון כדי להתחיל.",
    emptyArchived: "אין פרויקטים בארכיון.",
    emptyArchivedHint: "פרויקטים שהועברו לארכיון יופיעו כאן.",
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
    /** The four tiles above the projects table, folded from the shell lists. */
    summary: {
      active: "פרויקטים פעילים",
      items: "פריטים בפרויקטים",
      openLoans: "השאלות פתוחות",
      monthFeedback: "משובים החודש",
    },
    /** The projects table's own column headings, shorter than the tile labels. */
    columns: {
      items: "פריטים",
      loans: "השאלות",
      open: "פתוחות",
      feedback: "משובים",
    },
  },

  projectItems: {
    title: "פריטי הפרויקט",
    /** The items table shows category and model in one column. */
    typeAndModel: "קטגוריה ודגם",
    new: "פריט חדש",
    edit: "עריכת פריט",
    type: "קטגוריה",
    model: "דגם",
    serialId: "מספר סידורי",
    status: "סטטוס",
    location: "מיקום",
    selectTypeFirst: "בחר קטגוריה תחילה",
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
    returnedAt: "הוחזר בתאריך",
    notes: "הערות",
    signer: "איש קשר לחתימה",
    chooseSigner: "בחר איש קשר",
    signerHint: "מתוך אנשי הקשר שרשומים ליחידה הנבחרת",
    reloanNote: "פריט שנמצא בהשאלה פתוחה אינו ניתן להשאלה חוזרת עד להחזרתו.",
    selectLocationFirst: "בחר מיקום תחילה",
    noContactsForLocation: "אין אנשי קשר רשומים ליחידה זו.",
    addContact: "הוסף איש קשר",
    markReturned: "סמן כהוחזר",
    empty: "לא הושאלו פריטים בפרויקט זה.",
    noItems: "אין עדיין פריטים בפרויקט זה — הוסף פריט תחילה.",
    allLoaned: "כל הפריטים בפרויקט זה מושאלים כרגע.",
    noLocations: "אין מיקומים רשומים — הוסף מיקום בעמוד ״מיקומים״ תחילה.",
    statusLabels: {
      loaned: "מושאל",
      returned: "הוחזר",
      lost: "אבד",
    } as const,
  },

  feedback: {
    title: "משוב",
    new: "משוב חדש",
    location: "יחידה",
    rating: "דירוג",
    unrated: "ללא דירוג",
    content: "תוכן המשוב",
    at: "תאריך המשוב",
    empty: "טרם התקבל משוב בפרויקט זה.",

    /* The cross-project feed reached from the nav bar. */
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
    monthCount: "משובים החודש",
    /** The rail's second card: mean score per equipment category. */
    byCategory: "דירוג ממוצע לפי קטגוריה",
    byCategoryEmpty: "אין עדיין משוב המשויך להשאלה, ולכן אין פילוח לפי קטגוריה.",
    monthScope: (locations: number) =>
      locations === 1 ? "מיחידה אחת" : `מ־${locations} יחידות שונות`,
  },

  /** The standalone equipment page — categories, models, and the physical items under them. */
  equipmentPage: {
    title: "ציוד",
    subtitle: "ניהול קטגוריות ציוד, דגמים והפריטים שנרשמו תחתיהם",
    listTitle: "קטגוריות ציוד",
    entries: (n: number) => (n === 1 ? "רשומה אחת" : `${n} רשומות`),
    note:
      "רשימות הקטגוריות והדגמים מזינות את טופס הוספת הציוד בכל פרויקט. " +
      "מחיקת רשומה שנעשה בה שימוש תיחסם.",
    showLinkedItems: "הצג פריטים",
    linkedItemsEmpty: "לא נמצאו פריטים.",
    linkedItemsTitle: (name: string) => `פריטים המשויכים ל״${name}״`,
    /** A model is optional — equipment can be linked straight to a category with no model. */
    addItemToType: "ציוד ישירות לקטגוריה זו",
    noModel: "ללא דגם",
  },

  itemTypes: {
    name: "שם הקטגוריה",
    new: "קטגוריה חדשה",
    edit: "עריכת קטגוריה",
    empty: "אין עדיין קטגוריות. הוסף קטגוריה כדי להתחיל.",
    modelCount: (n: number) => (n === 1 ? "דגם אחד" : `${n} דגמים`),
  },

  itemModels: {
    name: "שם הדגם",
    type: "קטגוריה",
    new: "דגם חדש",
    edit: "עריכת דגם",
    empty: "אין עדיין דגמים.",
    /** The nested list under one category on the Equipment page. */
    emptyForType: "אין דגמים לקטגוריה זו.",
    addToType: "דגם לקטגוריה זו",
  },

  /** One physical piece of equipment — a serial number under a model. */
  equipment: {
    new: "ציוד חדש",
    edit: "עריכת ציוד",
    project: "פרויקט",
    noSerial: "ללא מספר סידורי",
    unitCount: (n: number) => (n === 1 ? "פריט אחד" : `${n} פריטים`),
    noProjects: "אין עדיין פרויקטים — צור פרויקט תחילה.",
    /** Says where status and location come from, since the add form does not ask. */
    defaultsNote: "ציוד חדש נרשם כנמצא במחסן. הסטטוס והמיקום ניתנים לשינוי בעריכת הפריט.",
  },

  locations: {
    /* The directory screen reached from the nav bar. */
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
    deleteConfirmTitle: "מחיקת מיקום",
    deleteConfirmMessage: (name: string) =>
      `למחוק את המיקום "${name}"? הפעולה אינה הפיכה, ותיחסם אם רשומים בו פריטים או השאלות.`,
    empty: "אין עדיין מיקומים.",
    emptyDirectory: "אין עדיין מיקומים. צור את הראשון כדי להתחיל.",
    noMatches: "אין מיקומים התואמים לסינון.",
    battalionCount: (n: number) => (n === 1 ? "יחידה אחת" : `${n} יחידות`),
    /** The grouped table's header strip, and the tally beside it. */
    grouped: "מקובץ לפי חטיבה",
    groupedCount: (units: number, groups: number) => `${units} יחידות ב־${groups} חטיבות`,
    /** The panel's own tally line, under the affiliation. */
    panelCounts: (items: number, open: number) =>
      `${items} פריטים כאן · ${open} השאלות פתוחות`,
  },

  /** The one-location screen; "unit" is what a location of kind יחידה is called. */
  units: {
    notFound: "היחידה לא נמצאה.",
    itemsTitle: "פריטים ביחידה",
    itemsEmpty: "לא נמצאו פריטים ביחידה זו.",
    project: "פרויקט",
  },

  /** People who can sign for a loan on behalf of a location — managed from the locations page. */
  contacts: {
    title: "אנשי קשר לחתימה",
    new: "איש קשר חדש",
    edit: "עריכת איש קשר",
    fullName: "שם מלא",
    personalNumber: "מספר אישי",
    phone: "טלפון",
    role: "תפקיד",
    empty: "אין אנשי קשר רשומים ליחידה זו.",
    add: "הוסף איש קשר",
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

/** Whether a timestamp falls in the current calendar month, in local time. */
export function isThisMonth(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
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
