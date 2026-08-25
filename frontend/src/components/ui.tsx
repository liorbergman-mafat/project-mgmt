import type { ReactNode } from "react";
import { useEffect } from "react";
import { t } from "../i18n";

/* -------------------------------------------------------------------------
 * Modal — used by every "new X" form.
 * ---------------------------------------------------------------------- */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
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

/* -------------------------------------------------------------------------
 * Field — label + control, so forms line up without repeating markup.
 * ---------------------------------------------------------------------- */
export function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <em className="req"> *</em>}
      </span>
      {children}
    </label>
  );
}

/* -------------------------------------------------------------------------
 * Status badges.
 * ---------------------------------------------------------------------- */
export function Badge({
  tone,
  children,
}: {
  tone: "green" | "blue" | "amber" | "red" | "grey";
  children: ReactNode;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

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
        <button className="btn btn-ghost" onClick={onAction}>
          {actionLabel}
        </button>
      )}
      {onRetry && (
        <button className="btn btn-ghost" onClick={onRetry}>
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
 * Rating — read-only stars for feedback.
 * ---------------------------------------------------------------------- */
export function Rating({ value }: { value: number | null }) {
  if (!value) return null;
  return (
    <span className="rating" title={`${value}/5`} aria-label={`${t.feedback.rating} ${value}/5`}>
      {"★".repeat(value)}
      <span className="rating-dim">{"★".repeat(5 - value)}</span>
    </span>
  );
}

/* -------------------------------------------------------------------------
 * FilterChips — one row of filter buttons. Always exactly one selected —
 * there is no "all".
 * ---------------------------------------------------------------------- */
export function FilterChips({
  label,
  values,
  selected,
  onSelect,
}: {
  label: string;
  values: string[];
  selected: string;
  onSelect: (next: string) => void;
}) {
  return (
    <div className="filter-group">
      <span className="filter-label">{label}</span>
      <div className="chips">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            className={`chip${selected === value ? " chip-on" : ""}`}
            onClick={() => onSelect(value)}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
