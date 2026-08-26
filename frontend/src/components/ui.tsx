import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { t } from "../i18n";

/* -------------------------------------------------------------------------
 * Modal — used by every "new X" form. Closes on backdrop click and Escape;
 * a click inside the dialog must not bubble out to the backdrop.
 * ---------------------------------------------------------------------- */
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
      <div className="form-body single">
        <p>{message}</p>
        {error && <ErrorBanner error={error} />}
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
  children,
}: {
  label: string;
  required?: boolean;
  span?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`field${span ? " span-2" : ""}`}>
      <span className="field-label">
        {label}
        {required && <em className="req"> *</em>}
      </span>
      {children}
    </label>
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
export type Tone = "green" | "blue" | "amber" | "red" | "grey";

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
  "במחסן": "blue",
  "בתחזוקה": "amber",
  "הושבת": "grey",
};

/* -------------------------------------------------------------------------
 * Page-level states.
 * ---------------------------------------------------------------------- */
export function EmptyState({ message }: { message: string }) {
  return <p className="empty-state">{message}</p>;
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
    <div className="error-banner">
      <span>{error}</span>
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

export function Spinner() {
  return <p className="muted">{t.common.loading}</p>;
}

/* -------------------------------------------------------------------------
 * Rating — read-only stars for feedback. Always five glyphs so the column
 * keeps its width; an unrated entry shows a dash instead.
 * ---------------------------------------------------------------------- */
export function Stars({ value }: { value: number | null }) {
  if (!value) {
    return (
      <span className="stars dim" aria-label={t.feedback.unrated}>
        {t.common.none}
      </span>
    );
  }
  return (
    <span className="stars" title={`${value}/5`} aria-label={`${t.feedback.rating} ${value}/5`}>
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
