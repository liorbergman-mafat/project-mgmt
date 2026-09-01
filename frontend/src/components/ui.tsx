import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { t } from "../i18n";
import { AlertIcon, InfoIcon, WarningIcon } from "./icons";

/* -------------------------------------------------------------------------
 * Modal — used by every "new X" form. Closes on backdrop click and Escape;
 * a click inside the dialog must not bubble out to the backdrop.
 *
 * Modals nest — the location form opens "new brigade" and the contact form
 * on top of itself — so the open ones are tracked in order and only the
 * innermost answers Escape. Otherwise one keypress closes the little form
 * *and* the half-filled one it was opened from.
 * ---------------------------------------------------------------------- */
const openModals: object[] = [];

export function Modal({
  title,
  onClose,
  wide,
  children,
}: {
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  // Read through a ref, so a new onClose on re-render never re-registers this
  // modal and moves it to the top of the stack ahead of its own children.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const token = {};
    openModals.push(token);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openModals[openModals.length - 1] === token) closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      const index = openModals.indexOf(token);
      if (index !== -1) openModals.splice(index, 1);
    };
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal${wide ? " modal-wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t.common.cancel}>
            ✕
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

/** The save / cancel bar every modal form ends with. */
export function FormActions({
  saving,
  disabled,
  onCancel,
}: {
  saving: boolean;
  disabled?: boolean;
  onCancel: () => void;
}) {
  return (
    <footer className="form-actions">
      <button type="submit" className="btn btn-primary" disabled={saving || disabled}>
        {saving ? t.common.loading : t.common.save}
      </button>
      <button type="button" className="btn btn-secondary" onClick={onCancel}>
        {t.common.cancel}
      </button>
      <div className="spacer" />
      {/* Says what the asterisks in the body mean, rather than repeating
          "required" under every field. */}
      <span className="form-note">
        {t.common.requiredNote} <em className="req">*</em> {t.common.requiredNoteTail}
      </span>
    </footer>
  );
}

/* -------------------------------------------------------------------------
 * ConfirmModal — an "are you sure?" dialog for destructive actions that are
 * too consequential for a bare window.confirm() (e.g. deleting a whole
 * project). Shows its own error banner if the confirmed action throws.
 * ---------------------------------------------------------------------- */
export function ConfirmModal({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  /** Red confirm button for irreversible/destructive actions. Defaults to true. */
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <div className="confirm-body">
        <span className="confirm-icon" aria-hidden="true">
          <WarningIcon />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p>{message}</p>
          {error && (
            <div style={{ marginTop: 12 }}>
              <ErrorBanner error={error} />
            </div>
          )}
        </div>
      </div>
      <footer className="form-actions">
        <button
          type="button"
          className={`btn ${danger === false ? "btn-primary" : "btn-danger"}`}
          disabled={busy}
          onClick={confirm}
        >
          {busy ? t.common.loading : (confirmLabel ?? t.common.delete)}
        </button>
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>
          {t.common.cancel}
        </button>
      </footer>
    </Modal>
  );
}

/* -------------------------------------------------------------------------
 * Field — label + control, so forms line up without repeating markup.
 * `span` makes the field take the full width of the two-column body.
 * ---------------------------------------------------------------------- */
export function Field({
  label,
  required,
  span,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  span?: boolean;
  /** Helper text under the control. */
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className={`field${span ? " span-2" : ""}`}>
      <span className="field-label">
        {label}
        {required && <em className="req"> *</em>}
      </span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

/** The teal note inside a form that explains a rule the fields can't state. */
export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="info-note span-2">
      <InfoIcon />
      <span>{children}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Combobox — a text input backed by a suggestion list, built on the native
 * <datalist> so free text always works: pick a suggestion or type a value
 * that isn't in the list yet. The caller decides what typing a new value
 * means (e.g. creating it on submit) — this component only edits the text.
 * ---------------------------------------------------------------------- */
export function Combobox({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  required,
  autoFocus,
  onFocus,
  onBlur,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const listId = `${id}-options`;
  return (
    <>
      <input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        autoComplete="off"
        onFocus={onFocus}
        onBlur={onBlur}
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </>
  );
}

/* -------------------------------------------------------------------------
 * Status pills.
 * ---------------------------------------------------------------------- */
export type Tone = "green" | "teal" | "amber" | "red" | "grey";

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

/**
 * Item statuses are rows in a table the user edits, not a fixed enum, so the
 * pill colour is keyed off the names the seed data ships with and falls back
 * to grey for anything added later.
 */
export const ITEM_STATUS_TONE: Record<string, Tone> = {
  "בשימוש": "green",
  "במחסן": "teal",
  "בתחזוקה": "amber",
  "הושבת": "grey",
};

/* -------------------------------------------------------------------------
 * Page-level states — loading, empty and error each replace the content
 * they stand in for, in place.
 * ---------------------------------------------------------------------- */

/** Widths of the four shimmer bars, so the skeleton reads as text, not a block. */
const SKELETON_WIDTHS = ["38%", "64%", "52%", "70%"];

export function Spinner() {
  return (
    <div className="skeleton-card" role="status" aria-label={t.common.loading}>
      {SKELETON_WIDTHS.map((width, i) => (
        <div
          key={width}
          className="skeleton-bar"
          style={{ width, animationDelay: `${i * 0.15}s` }}
        />
      ))}
      <div className="skeleton-foot">
        <span className="spinner" aria-hidden="true" />
        {t.common.loading}
      </div>
    </div>
  );
}

export function EmptyState({
  message,
  hint,
  icon,
  action,
}: {
  message: string;
  hint?: string;
  /** A 19px glyph in a teal tile above the message. */
  icon?: ReactNode;
  /** A secondary button under the hint — the way out of the empty state. */
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon && (
        <div className="empty-icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="empty-title">{message}</div>
      {hint && <div className="empty-hint">{hint}</div>}
      {action}
    </div>
  );
}

export function ErrorBanner({
  error,
  onRetry,
  actionLabel,
  onAction,
}: {
  error: string;
  onRetry?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="error-banner" role="alert">
      <AlertIcon />
      <span className="message">{error}</span>
      {actionLabel && onAction && (
        <button className="link-btn" onClick={onAction}>
          {actionLabel}
        </button>
      )}
      {onRetry && (
        <button className="link-btn" onClick={onRetry}>
          {t.common.retry}
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Rating — read-only stars for feedback. Always five glyphs so the column
 * keeps its width; an unrated entry shows a dash instead. The colour encodes
 * the score: gold normally, red for a complaint, grey when unrated.
 * ---------------------------------------------------------------------- */

/** A rating at or below this reads as a complaint. */
export const LOW_RATING = 2;

export function starTone(rating: number | null): "" | " low" | " none" {
  if (rating === null) return " none";
  return rating <= LOW_RATING ? " low" : "";
}

/** The 3px leading edge of a feedback card, keyed off the same score. */
export function edgeColour(rating: number | null): string {
  if (rating === null) return "var(--border-strong)";
  return rating <= LOW_RATING ? "var(--danger)" : "var(--brand-700)";
}

export function Stars({ value }: { value: number | null }) {
  if (!value) {
    return (
      <span className="stars none" aria-label={t.feedback.unrated}>
        {t.common.none}
      </span>
    );
  }
  return (
    <span
      className={`stars${starTone(value)}`}
      title={`${value}/5`}
      aria-label={`${t.feedback.rating} ${value}/5`}
    >
      {"★".repeat(value)}
      {"☆".repeat(5 - value)}
    </span>
  );
}

/* -------------------------------------------------------------------------
 * FilterChips — one row of filter buttons. Always exactly one selected.
 * ---------------------------------------------------------------------- */
export function FilterChips({
  label,
  values,
  selected,
  onSelect,
}: {
  label?: string;
  values: { key: string; label: string }[];
  selected: string;
  onSelect: (next: string) => void;
}) {
  return (
    <div className="chip-row">
      {label && <span className="chip-row-label">{label}</span>}
      {values.map((value) => (
        <button
          key={value.key}
          type="button"
          className={`chip${selected === value.key ? " on" : ""}`}
          onClick={() => onSelect(value.key)}
        >
          {value.label}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Tabs — switches a pane in place; the count after the label is dimmed.
 * ---------------------------------------------------------------------- */
export function Tabs<K extends string>({
  tabs,
  active,
  onSelect,
}: {
  tabs: { key: K; label: string; count?: number }[];
  active: K;
  onSelect: (key: K) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={active === tab.key}
          className={`tab${active === tab.key ? " on" : ""}`}
          onClick={() => onSelect(tab.key)}
        >
          {tab.label}
          {tab.count !== undefined && <span className="tab-count"> {tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Segmented — a two-state pill switch, e.g. פעילים / בארכיון.
 * ---------------------------------------------------------------------- */
export function Segmented<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
}) {
  return (
    <div className="segmented">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          className={value === option.key ? "on" : ""}
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
