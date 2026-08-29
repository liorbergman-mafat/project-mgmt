/**
 * חברון logo.
 *
 * `frontend/public/logo.png` is a cleaned crop of `frontend/brand/logo-source.jpg`,
 * which is the file as it was handed over: a 2816×1536 JPEG with the mark adrift
 * in a wide, faintly green-tinted field (247–252 rather than white) and a soft
 * drop shadow beneath the shield. The shipped PNG is cropped to the artwork,
 * has the shadow trimmed off, and had its ground flattened to a true 255 — the
 * outer field flood-filled from the border so the whites *inside* the shield
 * survive. Re-cut it from the source rather than from the PNG.
 *
 * A pure-white ground is what `mix-blend-mode: multiply` needs: it makes the
 * ground vanish into whatever light surface the mark sits on, so the one file
 * works on both the white bar and the N20 login canvas. Multiplying the
 * original would have smeared its tint across both.
 *
 * The mark carries no wordmark, so callers that need the name set it in text
 * alongside — see the bar's `.brand` and the login lockup.
 */
const SRC = "/logo.png";

/** The shipped crop, 423×480 - enough for the 104px login mark at DPR 4. */
const ASPECT = 423 / 480;

/** `size` is the rendered height; the width follows from the artwork. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <img
      className="logo"
      src={SRC}
      alt="חברון"
      width={Math.round(size * ASPECT)}
      height={size}
    />
  );
}
