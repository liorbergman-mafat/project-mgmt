import { t } from "../i18n";

/**
 * The מנהלת's mark (AI&Autonomy) — the one logo the app shows.
 *
 * `frontend/public/parent-mark.png` is the lockup with its wordmark cropped
 * off and its ground removed, so it reads on the white top bar and on the dark
 * login canvas alike. `parent-logo.png` beside it keeps the full lockup, with
 * the wordmark, for light-background contexts (print, exports).
 *
 * The חברון shield is deliberately gone: the app sets its own name in text
 * (the sidebar's `.sidebar-brand`, the login lockup) rather than in a mark.
 * Size comes from CSS at each site, so the same element is 30px in the top bar
 * and 210px on the login art.
 */
export function ParentMark({ className = "parent-mark" }: { className?: string }) {
  return (
    <img
      className={className}
      src="/parent-mark.png"
      alt=""
      title={t.shell.parentOrg}
      width={228}
      height={211}
    />
  );
}
