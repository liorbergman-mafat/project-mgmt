import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useAsync } from "../hooks";
import { formatRelative, itemLabel, t } from "../i18n";
import { groupByBrigade, options, sortCategories } from "../locationGrouping";
import { affiliation, buildLocationStats, emptyStats } from "../locationStats";
import type { LocationStats } from "../locationStats";
import { useShell } from "../shellData";
import { ContactFormModal } from "../components/ContactFormModal";
import { LocationFormModal } from "../components/LocationFormModal";
import { ChevronDown, LocationsIcon } from "../components/icons";
import {
  ConfirmModal,
  EmptyState,
  ErrorBanner,
  FilterChips,
  Pill,
  Spinner,
  Stars,
} from "../components/ui";
import type { Item, Location, ProjectSummary } from "../types";

/** The chip that turns the category filter off. Not a category name. */
const ALL = "__all__";

/* ========================================================================
 * The directory: every location grouped by brigade, a drill-down beside it.
 * ===================================================================== */
export function LocationsPage() {
  const shell = useShell();
  const { data, error, loading, reload } = shell.locations;

  // The numbers beside each location are folded together here — see locationStats.
  const items = shell.items;
  const loans = useAsync(() => api.loans.list(), []);
  const stats = useMemo(
    () => buildLocationStats(items.data ?? [], loans.data ?? [], shell.feedback.data ?? []),
    [items.data, loans.data, shell.feedback.data],
  );

  const all = data ?? [];

  // One chip row, in the fixed briefing order rather than alphabetical, with
  // "all" in front — the directory runs to a few hundred rows and category is
  // the cut that makes it navigable.
  const [category, setCategory] = useState<string>(ALL);
  const categories = useMemo(
    () => [
      { key: ALL, label: t.feedback.filters.all },
      ...sortCategories(options(all, (row) => row.category)).map((value) => ({
        key: value,
        label: value,
      })),
    ],
    [all],
  );

  const activeCategory = categories.some((c) => c.key === category) ? category : ALL;
  const visible =
    activeCategory === ALL ? all : all.filter((row) => row.category === activeCategory);

  // A category can span hundreds of units, so they sit in collapsible buckets
  // keyed by (category, brigade) — see groupByBrigade.
  //
  // They open *shut*: this directory is 243 units across 71 brigades, and
  // expanding all of them at once is the wall of rows the grouping exists to
  // avoid. Collapsed, each brigade is one row that still carries its totals.
  const groups = useMemo(() => groupByBrigade(visible), [visible]);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  function toggleGroup(key: string) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Only a row that is actually on screen can stay selected — filtering the
  // category out, or collapsing its group, takes the panel with it.
  const shownRows = useMemo(
    () => groups.filter((g) => open[g.key]).flatMap((g) => g.rows),
    [groups, open],
  );
  const selected = shownRows.find((row) => row.id === selectedId) ?? null;

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [addingContact, setAddingContact] = useState(false);
  const [deleting, setDeleting] = useState<Location | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function afterSaved(saved: Location) {
    setCreating(false);
    setEditing(null);
    // Open the saved row's group, so it is visible right away.
    const key = `${saved.category ?? ""} ${saved.brigade ?? ""}`;
    setOpen((prev) => ({ ...prev, [key]: true }));
    setSelectedId(saved.id);
    reload();
  }

  async function remove(location: Location) {
    setActionError(null);
    try {
      await api.locations.remove(location.id);
      setSelectedId(null);
      setDeleting(null);
      reload();
    } catch (err) {
      setActionError((err as Error).message);
      setDeleting(null);
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{t.locations.title}</h1>
          <p className="subtitle">{t.locations.subtitle}</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            + {t.locations.new}
          </button>
        </div>
      </header>

      {error && <ErrorBanner error={error} onRetry={reload} />}
      {actionError && <ErrorBanner error={actionError} />}
      {items.error && <ErrorBanner error={items.error} onRetry={items.reload} />}
      {loans.error && <ErrorBanner error={loans.error} onRetry={loans.reload} />}
      {loading && <Spinner />}

      {data && all.length === 0 && (
        <EmptyState
          message={t.locations.emptyDirectory}
          icon={<LocationsIcon size={19} />}
          action={
            <button className="btn btn-secondary btn-sm" onClick={() => setCreating(true)}>
              + {t.locations.new}
            </button>
          }
        />
      )}

      {all.length > 0 && categories.length > 2 && (
        <FilterChips values={categories} selected={activeCategory} onSelect={setCategory} />
      )}

      {all.length > 0 && visible.length === 0 && (
        <EmptyState message={t.locations.noMatches} icon={<LocationsIcon size={19} />} />
      )}

      {visible.length > 0 && (
        <div className="split split-locations">
          <div className="table-card main-pane">
            <div className="card-head">
              <span className="title quiet">{t.locations.grouped}</span>
              <span className="count num">
                {t.locations.groupedCount(visible.length, groups.length)}
              </span>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t.locations.name}</th>
                    <th>{t.locations.battalion}</th>
                    <th>{t.locations.category}</th>
                    <th>{t.locations.itemsHere}</th>
                    <th>{t.locations.openLoans}</th>
                  </tr>
                </thead>

                {groups.map((group) => {
                  const shut = !open[group.key];
                  // The two right-hand columns keep counting while the group
                  // is shut, so a collapsed brigade still says how much sits
                  // under it.
                  const totals = group.rows.reduce(
                    (acc, row) => {
                      const stat = stats.get(row.id) ?? emptyStats();
                      return {
                        items: acc.items + stat.itemCount,
                        open: acc.open + stat.openLoans,
                      };
                    },
                    { items: 0, open: 0 },
                  );

                  return (
                    <tbody key={group.key}>
                      <tr
                        className="group-row"
                        onClick={() => toggleGroup(group.key)}
                        aria-expanded={!shut}
                      >
                        <td colSpan={3}>
                          <div className="group-head-cell">
                            <span
                              className={`chevron${shut ? " collapsed" : ""}`}
                              aria-hidden="true"
                            >
                              <ChevronDown />
                            </span>
                            <span className="label">{group.label}</span>
                            <span className="count">
                              {t.locations.battalionCount(group.rows.length)}
                            </span>
                          </div>
                        </td>
                        <td className="num">{totals.items}</td>
                        <td className="num">{totals.open}</td>
                      </tr>

                      {!shut &&
                        group.rows.map((row) => {
                          const stat = stats.get(row.id) ?? emptyStats();
                          return (
                            <tr
                              key={row.id}
                              className={`selectable${selected?.id === row.id ? " row-selected" : ""}`}
                              onClick={() => setSelectedId(row.id)}
                            >
                              <td className="strong">
                                <span className="row-indent">{row.name}</span>
                              </td>
                              <td>{row.battalion ?? t.common.none}</td>
                              <td className="muted">{row.category ?? t.common.none}</td>
                              <td className="num">{stat.itemCount}</td>
                              <td
                                className={`num strong${stat.openLoans > 0 ? " teal" : " dim"}`}
                              >
                                {stat.openLoans}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  );
                })}
              </table>
            </div>
          </div>

          <LocationPanel
            location={selected}
            stats={selected ? stats.get(selected.id) : undefined}
            onEdit={() => selected && setEditing(selected)}
            onDelete={() => selected && setDeleting(selected)}
            onAddContact={() => setAddingContact(true)}
          />
        </div>
      )}

      {(creating || editing) && (
        <LocationFormModal
          location={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={afterSaved}
        />
      )}

      {addingContact && selected && (
        <ContactFormModal
          locationId={selected.id}
          onClose={() => setAddingContact(false)}
          onSaved={() => setAddingContact(false)}
        />
      )}

      {deleting && (
        <ConfirmModal
          title={t.locations.deleteConfirmTitle}
          message={t.locations.deleteConfirmMessage(deleting.name)}
          onClose={() => setDeleting(null)}
          onConfirm={() => remove(deleting)}
        />
      )}
    </>
  );
}

/**
 * The drill-down beside the table. Stays mounted with nothing selected so the
 * row doesn't reflow when a selection comes and goes.
 */
function LocationPanel({
  location,
  stats,
  onEdit,
  onDelete,
  onAddContact,
}: {
  location: Location | null;
  stats: LocationStats | undefined;
  onEdit: () => void;
  onDelete: () => void;
  onAddContact: () => void;
}) {
  if (!location) {
    return (
      <aside className="panel">
        <div className="panel-body">
          <p className="muted small">{t.locations.noSelection}</p>
        </div>
      </aside>
    );
  }

  const stat = stats ?? emptyStats();

  return (
    <aside className="panel">
      <div className="panel-head">
        <div className="panel-title-row">
          <div className="panel-title">{location.name}</div>
          <div className="row-actions">
            <button type="button" className="link-btn" onClick={onEdit}>
              {t.common.edit}
            </button>
            <button type="button" className="link-btn danger" onClick={onDelete}>
              {t.common.delete}
            </button>
          </div>
        </div>
        <div className="panel-sub">
          {[affiliation(location), location.category].filter(Boolean).join(" · ") ||
            t.common.none}
        </div>
        <div className="panel-counts num">
          {t.locations.panelCounts(stat.itemCount, stat.openLoans)}
        </div>
      </div>

      <div className="panel-body">
        <div className="panel-block">
          <span className="section-label">{t.locations.contact}</span>
          <div className="panel-contact">
            {location.contact_name ?? t.common.none}
            <div className="phone ltr">{location.contact_phone ?? t.common.none}</div>
          </div>
        </div>

        <div className="divider" />

        <div className="panel-block">
          <span className="section-label">{t.locations.stock}</span>
          {stat.stock.length === 0 ? (
            <p className="muted small">{t.locations.stockEmpty}</p>
          ) : (
            <div className="stock-list">
              {stat.stock.map((row) => (
                <div className="stock-row" key={row.label}>
                  <span>{row.label}</span>
                  <span className="count num">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="divider" />

        <div className="panel-block">
          <span className="section-label">{t.locations.lastFeedback}</span>
          {stat.lastFeedback ? (
            <div className="inset">
              <div className="inset-head">
                <Stars value={stat.lastFeedback.rating} />
                <div className="spacer" />
                <time dateTime={stat.lastFeedback.feedback_at}>
                  {formatRelative(stat.lastFeedback.feedback_at)}
                </time>
              </div>
              <p>{stat.lastFeedback.content}</p>
            </div>
          ) : (
            <p className="muted small">{t.locations.lastFeedbackEmpty}</p>
          )}
        </div>

        <button type="button" className="btn btn-secondary btn-sm" onClick={onAddContact}>
          + {t.contacts.add}
        </button>

        <Link className="btn btn-secondary btn-sm" to={`/locations/${location.id}`}>
          {t.locations.openDetail}
        </Link>
      </div>
    </aside>
  );
}

/* ========================================================================
 * One location, with everything it holds sorted by project.
 * ===================================================================== */
type ProjectGroup = { projectId: string; project: ProjectSummary | undefined; items: Item[] };

/** Items sorted into one bucket per project, the buckets sorted by project name (Hebrew). */
function groupByProject(items: Item[], projectsById: Map<string, ProjectSummary>): ProjectGroup[] {
  const buckets = new Map<string, ProjectGroup>();
  for (const item of items) {
    const bucket = buckets.get(item.project_id);
    if (bucket) bucket.items.push(item);
    else
      buckets.set(item.project_id, {
        projectId: item.project_id,
        project: projectsById.get(item.project_id),
        items: [item],
      });
  }
  return [...buckets.values()].sort((a, b) =>
    (a.project?.name ?? "").localeCompare(b.project?.name ?? "", "he"),
  );
}

export function LocationDetailPage() {
  const { locationId } = useParams<{ locationId: string }>();
  const id = locationId!;
  const shell = useShell();
  const navigate = useNavigate();

  const location = useAsync(() => api.locations.get(id), [id]);
  const items = useAsync(() => api.items.list({ locationId: id }), [id]);
  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function remove() {
    if (!confirm(t.common.confirmDelete)) return;
    setActionError(null);
    try {
      await api.locations.remove(id);
      shell.locations.reload();
      navigate("/locations");
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  if (location.loading || items.loading) return <Spinner />;
  if (location.error) return <ErrorBanner error={location.error} onRetry={location.reload} />;
  if (items.error) return <ErrorBanner error={items.error} onRetry={items.reload} />;
  if (!location.data) return <ErrorBanner error={t.units.notFound} />;

  const unit = location.data;
  const projectsById = new Map((shell.projects.data ?? []).map((p) => [p.id, p]));
  const groups = groupByProject(items.data ?? [], projectsById);

  return (
    <>
      <Link to="/locations" className="back-link">
        ← {t.common.back} {t.nav.locations}
      </Link>

      {actionError && <ErrorBanner error={actionError} />}

      <header className="page-header">
        <div>
          <div className="title-row">
            <h1>{unit.name}</h1>
            {unit.kind && <Pill tone="grey">{unit.kind}</Pill>}
          </div>
          <p className="subtitle">{affiliation(unit) || t.common.none}</p>
        </div>
        <div className="header-actions">
          <div className="panel-contact" style={{ textAlign: "start" }}>
            {unit.contact_name ?? t.common.none}
            <div className="num" style={{ color: "var(--slate)" }}>
              {unit.contact_phone ?? t.common.none}
            </div>
          </div>
          <button className="btn btn-secondary" onClick={() => setEditing(true)}>
            {t.common.edit}
          </button>
          <button className="btn btn-ghost danger" onClick={remove}>
            {t.common.delete}
          </button>
        </div>
      </header>

      {editing && (
        <LocationFormModal
          location={unit}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            location.reload();
            shell.locations.reload();
          }}
        />
      )}

      {(items.data ?? []).length === 0 ? (
        <EmptyState message={t.units.itemsEmpty} />
      ) : (
        groups.map((group) => (
          <section key={group.projectId} style={{ marginBottom: 22 }}>
            <div className="pane-header">
              <h2 style={{ fontSize: 17 }}>
                {group.project ? (
                  <Link to={`/projects/${group.project.id}`}>{group.project.name}</Link>
                ) : (
                  t.common.none
                )}
              </h2>
              <span className="muted small num">{group.items.length}</span>
            </div>

            <div className="table-card">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{t.projectItems.typeAndModel}</th>
                      <th>{t.projectItems.serialId}</th>
                      <th>{t.projectItems.status}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item) => (
                      <tr key={item.id}>
                        <td className="strong">{itemLabel(item)}</td>
                        <td className="num" style={{ color: "var(--slate)" }}>
                          {item.serial_id ?? t.common.none}
                        </td>
                        <td>
                          <Pill tone="grey">{item.status?.name ?? t.common.none}</Pill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ))
      )}
    </>
  );
}
