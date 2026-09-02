/**
 * All user-facing Hebrew strings live here, so the UI text is in one place
 * and the components stay free of hardcoded copy.
 */
export const t = {
  appName: "חברון",
  nav: {
    projects: "פרויקטים",
    equipment: "ציוד",
    locations: "יחידות",
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
    parentOrg: "מנהלת AI&Autonomy",
  },

  auth: {
    title: "ניהול השאלות והטמעות",
    subtitle: "מערכת פנימית. גישה למשתמשים מורשים בלבד.",
    googleSignIn: "התחברות עם Google",
    checking: "מאמת הרשאה…",
    notAuthorized: "החשבון שאיתו התחברת אינו מורשה לשימוש במערכת. פנה למנהל המערכת.",
    idleLogout: "התנתקת עקב חוסר פעילות. יש להתחבר מחדש.",
    note: "כל הפעולות במערכת נרשמות ומשויכות למשתמש.",
    /** The avatar's tooltip / the line under the name in the nav footer. */
    role: "משתמש מערכת",
    adminRole: "מנהל מערכת",
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
    location: "יחידה",
    selectTypeFirst: "בחר קטגוריה תחילה",
    empty: "טרם נוספו פריטים לפרויקט זה.",
  },

  loans: {
    title: "השאלות",
    new: "השאלה חדשה",
    item: "פריט",
    location: "יחידה",
    quantity: "כמות",
    status: "סטטוס",
    loanedAt: "תאריך השאלה",
    returnedAt: "הוחזר בתאריך",
    notes: "הערות",
    signer: "איש קשר לחתימה",
    chooseSigner: "בחר איש קשר",
    signerHint: "מתוך אנשי הקשר שרשומים ליחידה הנבחרת",
    reloanNote: "פריט שנמצא בהשאלה פתוחה אינו ניתן להשאלה חוזרת עד להחזרתו.",
    selectLocationFirst: "בחר יחידה תחילה",
    noContactsForLocation: "אין אנשי קשר רשומים ליחידה זו.",
    addContact: "הוסף איש קשר",
    markReturned: "סמן כהוחזר",
    empty: "לא הושאלו פריטים בפרויקט זה.",
    noItems: "אין עדיין פריטים בפרויקט זה — הוסף פריט תחילה.",
    allLoaned: "כל הפריטים בפרויקט זה מושאלים כרגע.",
    noLocations: "אין יחידות רשומות — הוסף יחידה בעמוד ״יחידות״ תחילה.",
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
    defaultsNote: "ציוד חדש נרשם כנמצא במחסן. הסטטוס והיחידה ניתנים לשינוי בעריכת הפריט.",
  },

  locations: {
    /* The directory screen reached from the nav bar. */
    title: "יחידות",
    subtitle: "יחידות ומחסנים — היכן שנמצא כל ציוד",
    itemCount: "פריטים",
    itemsHere: "פריטים כאן",
    openLoans: "השאלות פתוחות",
    contact: "איש קשר",
    stock: "ציוד ביחידה",
    stockEmpty: "אין פריטים רשומים ביחידה זו.",
    lastFeedback: "משוב אחרון",
    lastFeedbackEmpty: "טרם התקבל משוב מיחידה זו.",
    openDetail: "הצג פריטים ביחידה",
    noSelection: "בחר יחידה מהרשימה.",

    name: "שם",
    kind: "סוג יחידה",
    selectKind: "בחר סוג",
    kindOptions: ["יחידה", "מחסן"],
    category: "קטגוריה",
    /** The chip for units saved without one — the filter has no "all". */
    noCategory: "ללא קטגוריה",
    brigade: "חטיבה",
    battalion: "גדוד",
    /* The category and brigade pickers list what the directory already uses;
       the "+" beside each one names a value that isn't in the list yet. */
    selectCategory: "בחר קטגוריה",
    selectBrigade: "בחר חטיבה",
    addCategory: "הוספת קטגוריה",
    addBrigade: "הוספת חטיבה",
    newCategory: "קטגוריה חדשה",
    newBrigade: "חטיבה חדשה",
    categoryName: "שם הקטגוריה",
    brigadeNumber: "מספר חטיבה",
    brigadeName: "שם חטיבה",
    battalionNumber: "מספר גדוד",
    battalionName: "שם גדוד",
    /** A brigade or battalion needs a number or a name — either one will do. */
    numberOrName: "יש להזין מספר, שם, או שניהם.",
    contactName: "איש קשר",
    contactPhone: "טלפון",
    notes: "הערות",
    new: "יחידה חדשה",
    edit: "עריכת יחידה",
    deleteConfirmTitle: "מחיקת יחידה",
    deleteConfirmMessage: (name: string) =>
      `למחוק את היחידה "${name}"? הפעולה אינה הפיכה, ותיחסם אם רשומים בה פריטים או השאלות.`,
    empty: "אין עדיין יחידות.",
    emptyDirectory: "אין עדיין יחידות. צור את הראשונה כדי להתחיל.",
    noMatches: "אין יחידות התואמות לסינון.",
    battalionCount: (n: number) => (n === 1 ? "יחידה אחת" : `${n} יחידות`),
    /** The grouped table's header strip, and the tally beside it. */
    grouped: "מקובץ לפי חטיבה",
    groupedCount: (units: number, groups: number) => `${units} יחידות ב־${groups} חטיבות`,
    /** The panel's own tally line, under the affiliation. */
    panelCounts: (items: number, open: number) =>
      `${items} פריטים כאן · ${open} השאלות פתוחות`,
  },

  /** The single-location screen. The UI calls locations יחידות throughout, so
      this reads the same as the directory — `kind` still separates a יחידה
      from a מחסן in the data. */
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

  /* ======================================================================
   * Settings — reached from the gear at the foot of the nav bar. Holds the
   * activity log (everyone) and the allowlist (admins only).
   * =================================================================== */
  settings: {
    title: "הגדרות",
    subtitle: "יומן הפעולות של המערכת וניהול ההרשאות",
    tabs: {
      activity: "פעולות",
      access: "הרשאות",
    },
  },

  /* ======================================================================
   * Activity — a tab under Settings. Visible to any signed-in user.
   * =================================================================== */
  activity: {
    title: "פעולות",
    subtitle: "כל שינוי שבוצע במערכת, לפי מי שביצע אותו",
    when: "מתי",
    actor: "מי ביצע",
    action: "סוג הפעולה",
    subject: "על מה",
    unknownActor: "לא ידוע",
    searchPlaceholder: "חיפוש לפי משתמש או רשומה",
    empty: "טרם נרשמו פעולות במערכת.",
    noMatches: "אין פעולות התואמות לסינון.",
    note: "היומן נרשם אוטומטית ואינו ניתן לעריכה. מוצגות 300 הפעולות האחרונות.",
    /** The chip row above the table. Keys match the action keys below. */
    filters: {
      all: "הכול",
      login: "כניסות",
      create: "הוספות",
      update: "עדכונים",
      delete: "מחיקות",
    },
    /** The API records stable keys; these are the words the screen shows. */
    actions: {
      login: "כניסה למערכת",
      create: "הוספה",
      update: "עדכון",
      delete: "מחיקה",
      archive: "העברה לארכיון",
      unarchive: "שחזור מארכיון",
      return: "החזרת פריט",
      read: "צפייה ברשימה",
    } as const,
    /** What the action was done to. */
    entities: {
      projects: "פרויקט",
      items: "פריט ציוד",
      "item-types": "קטגוריית ציוד",
      "item-models": "דגם ציוד",
      locations: "יחידה",
      contacts: "איש קשר",
      loans: "השאלה",
      feedback: "משוב",
      "allowed-users": "משתמש מורשה",
      auth: "התחברות",
    } as const,
    /** Nothing technical ever reaches the screen — an unknown key reads plainly. */
    unknownAction: "פעולה",
    unknownEntity: "רשומה",
  },

  /* ======================================================================
   * הרשאות — the authorization allowlist. Admin-only.
   * =================================================================== */
  access: {
    title: "הרשאות",
    subtitle: "מי מורשה להשתמש במערכת. הכניסה עצמה היא דרך חשבון Google.",
    sectionLabel: "משתמשים מורשים",
    add: "הוספת משתמש",
    addTitle: "הוספת משתמש מורשה",
    email: "כתובת אימייל (Google)",
    emailHint: "בדיוק כפי שהיא מופיעה בחשבון ה־Google של המשתמש.",
    note: "הערה",
    notePlaceholder: "למשל: שם מלא, תפקיד",
    admin: "מנהל",
    adminHint: "מנהל יכול לערוך את רשימת ההרשאות. אין לכך השפעה על שאר המסכים.",
    isAdmin: "מנהל מערכת",
    member: "משתמש",
    you: "זה אתה",
    added: "נוסף",
    empty: "אין עדיין משתמשים מורשים.",
    invalidEmail: "כתובת אימייל לא תקינה.",
    makeAdmin: "הפוך למנהל",
    revokeAdmin: "בטל הרשאת מנהל",
    removeTitle: "הסרת הרשאה",
    removeMessage: (email: string) =>
      `להסיר את "${email}" מרשימת המורשים? המשתמש לא יוכל להיכנס יותר. הפעולה אינה הפיכה.`,
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
