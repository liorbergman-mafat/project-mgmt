import type { ReactNode } from "react";

/* ------------------------------------------------------------------------
 * Small outline glyphs, stroked in `currentColor` so each one takes the
 * colour of whatever it sits in. Everything is drawn on a 24 grid and sized
 * by the caller — no icon library.
 * --------------------------------------------------------------------- */
function Glyph({
  size,
  width = 1.7,
  children,
}: {
  size: number;
  width?: number;
  children: ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Stacked layers — a set of projects. Also the projects empty state. */
export function ProjectsIcon({ size = 20 }: { size?: number }) {
  return (
    <Glyph size={size}>
      <path d="M12 3 3 7.5l9 4.5 9-4.5L12 3Z" />
      <path d="M3 12.5 12 17l9-4.5" />
      <path d="M3 17 12 21.5 21 17" />
    </Glyph>
  );
}

/** An open crate — the equipment catalogue. */
export function EquipmentIcon({ size = 20 }: { size?: number }) {
  return (
    <Glyph size={size}>
      <path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" />
      <path d="M3 8.5V16l9 4.5 9-4.5V8.5" />
      <path d="M12 13v7.5" />
    </Glyph>
  );
}

/** Map pin — a place equipment can sit. */
export function LocationsIcon({ size = 20 }: { size?: number }) {
  return (
    <Glyph size={size}>
      <path d="M20 10.5c0 5.2-8 11-8 11s-8-5.8-8-11a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10.5" r="2.8" />
    </Glyph>
  );
}

/** Speech bubble — what came back from the field. */
export function FeedbackIcon({ size = 20 }: { size?: number }) {
  return (
    <Glyph size={size}>
      <path d="M20.5 12.5a7.5 7.5 0 0 1-10.9 6.7L4 20.5l1.4-5.2A7.5 7.5 0 1 1 20.5 12.5Z" />
      <path d="M9 11.5h6M9 14.5h3.5" />
    </Glyph>
  );
}

/**
 * Leaving through the door. Drawn pointing at the inline end of a right-to-left
 * line — the direction the reader leaves in — rather than mirrored at runtime.
 */
export function SignOutIcon({ size = 15 }: { size?: number }) {
  return (
    <Glyph size={size} width={1.9}>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M8 8 4 12l4 4" />
      <path d="M4 12h10" />
    </Glyph>
  );
}

/** Back — points at the inline end of the line, i.e. left-to-right in RTL. */
export function BackIcon({ size = 13 }: { size?: number }) {
  return (
    <Glyph size={size} width={2.1}>
      <path d="m14 6 6 6-6 6" />
      <path d="M20 12H5" />
    </Glyph>
  );
}

/** Points at the reading edge when open, rotated 90° by CSS when collapsed. */
export function ChevronDown({ size = 12 }: { size?: number }) {
  return (
    <Glyph size={size} width={2.2}>
      <path d="m6 9 6 6 6-6" />
    </Glyph>
  );
}

/** The categories tree's disclosure caret, pointing into the RTL reading flow. */
export function ChevronStart({ size = 13 }: { size?: number }) {
  return (
    <Glyph size={size} width={2}>
      <path d="m10 6-6 6 6 6" />
    </Glyph>
  );
}

/** Open a row — an arrow into the RTL reading flow, matching ChevronStart. */
export function OpenIcon({ size = 15 }: { size?: number }) {
  return (
    <Glyph size={size} width={2}>
      <path d="m11 6-6 6 6 6" />
      <path d="M19 12H5" />
    </Glyph>
  );
}

/** Add a value to the list beside it — the "+" next to a dropdown. */
export function PlusIcon({ size = 14 }: { size?: number }) {
  return (
    <Glyph size={size} width={2.2}>
      <path d="M12 5v14M5 12h14" />
    </Glyph>
  );
}

/** Delete a row. */
export function TrashIcon({ size = 15 }: { size?: number }) {
  return (
    <Glyph size={size} width={1.8}>
      <path d="M4 7h16" />
      <path d="M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" />
      <path d="M6.5 7l.8 12a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5L17.5 7" />
      <path d="M10.4 11v6M13.6 11v6" />
    </Glyph>
  );
}

export function AlertIcon({ size = 15 }: { size?: number }) {
  return (
    <Glyph size={size} width={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.2v.1" />
    </Glyph>
  );
}

export function InfoIcon({ size = 14 }: { size?: number }) {
  return (
    <Glyph size={size} width={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.8v.1" />
    </Glyph>
  );
}

/** The triangle beside a confirm dialog's message. */
export function WarningIcon({ size = 16 }: { size?: number }) {
  return (
    <Glyph size={size} width={2}>
      <path d="M12 9v4.5M12 17v.1" />
      <path d="M10.3 3.9 2.6 17.4A2 2 0 0 0 4.3 20.4h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </Glyph>
  );
}

/** Gear — the settings entry point at the foot of the nav bar. */
export function SettingsIcon({ size = 16 }: { size?: number }) {
  return (
    <Glyph size={size} width={1.8}>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a1.9 1.9 0 1 1-2.7 2.7l-.05-.06a1.6 1.6 0 0 0-1.78-.32 1.6 1.6 0 0 0-1 1.47v.17a1.9 1.9 0 1 1-3.8 0v-.09a1.6 1.6 0 0 0-1.05-1.46 1.6 1.6 0 0 0-1.77.32l-.06.06a1.9 1.9 0 1 1-2.7-2.7l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-1H3.6a1.9 1.9 0 1 1 0-3.8h.09a1.6 1.6 0 0 0 1.46-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a1.9 1.9 0 1 1 2.7-2.7l.06.06a1.6 1.6 0 0 0 1.77.32H9.4a1.6 1.6 0 0 0 1-1.47V3.6a1.9 1.9 0 1 1 3.8 0v.09a1.6 1.6 0 0 0 1 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a1.9 1.9 0 1 1 2.7 2.7l-.06.06a1.6 1.6 0 0 0-.32 1.77v.01a1.6 1.6 0 0 0 1.47 1h.17a1.9 1.9 0 1 1 0 3.8h-.09a1.6 1.6 0 0 0-1.46 1Z" />
    </Glyph>
  );
}

/** Two people — the users screen. */
export function UsersIcon({ size = 19 }: { size?: number }) {
  return (
    <Glyph size={size}>
      <path d="M15.5 20v-1.8a3.6 3.6 0 0 0-3.6-3.6H6.6A3.6 3.6 0 0 0 3 18.2V20" />
      <circle cx="9.25" cy="7.4" r="3.4" />
      <path d="M21 20v-1.8a3.6 3.6 0 0 0-2.7-3.48" />
      <path d="M16 4.13a3.6 3.6 0 0 1 0 6.55" />
    </Glyph>
  );
}

/** A clock over a list — the record of what happened, and when. */
export function ActivityIcon({ size = 19 }: { size?: number }) {
  return (
    <Glyph size={size}>
      <path d="M4 6h9M4 11h6M4 16h5" />
      <circle cx="16.5" cy="15.5" r="5.5" />
      <path d="M16.5 13v2.6l1.7 1.1" />
    </Glyph>
  );
}

/** A key — changing someone's password. */
export function KeyIcon({ size = 15 }: { size?: number }) {
  return (
    <Glyph size={size} width={1.8}>
      <circle cx="15.5" cy="8.5" r="4.5" />
      <path d="m12.3 11.7-8.8 8.8" />
      <path d="m6.5 17.5 2.2 2.2M9 15l2.2 2.2" />
    </Glyph>
  );
}

/** Pencil — editing a row in place. */
export function EditIcon({ size = 15 }: { size?: number }) {
  return (
    <Glyph size={size} width={1.8}>
      <path d="M12 20h8" />
      <path d="M16.4 4.6a2.1 2.1 0 0 1 3 3L8.5 18.5l-4 1 1-4Z" />
    </Glyph>
  );
}
