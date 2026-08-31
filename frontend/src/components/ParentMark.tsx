import { t } from "../i18n";

/**
 * חברון logo.
 *
 * `frontend/public/logo.png` is the mark as handed over with the restyle: the
 * shield at 423×480, its white ground removed with an edge flood-fill so the
 * white panels *inside* the shield survive. Because the ground is transparent
 * rather than white, the one file works on the dark sidebar, the dark login
 * canvas and the white login column alike — no blend mode needed.
 *
 * The mark carries no wordmark, so callers that need the name set it in text
 * alongside — see the sidebar's `.sidebar-brand` and the login lockup. Size
 * comes from CSS at each of those sites, so the same element can be 28px in
 * the sidebar and 190px on the login art.
 */
const SRC = "/logo.png";

export function Logo({ className = "logo" }: { className?: string }) {
  return <img className={className} src={SRC} alt="" width={423} height={480} />;
}

/**
 * The parent organisation's mark (AI&Autonomy), shown small and uncaptioned in
 * the far corner of the top bar. `parent-logo.png` beside it keeps the full
 * lockup for light-background contexts (print, exports).
 */
export function ParentMark() {
  return (
    <img
      className="parent-mark"
      src="/parent-mark.png"
      alt=""
      title={t.shell.parentOrg}
      width={228}
      height={211}
    />
  );
}
