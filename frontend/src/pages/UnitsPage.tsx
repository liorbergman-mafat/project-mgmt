import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useAsync } from "../hooks";
import { t } from "../i18n";
import { Badge, EmptyState, ErrorBanner, FilterChips, Spinner } from "../components/ui";
import { groupByBrigade, options, sortCategories } from "../locationGrouping";
import type { Item, ProjectSummary } from "../types";

/**
 * Locations of this kind are what the rest of the app calls "units" — see
 * the comment on the `locations` table in supabase/schema.sql. Other kinds
 * (warehouses, etc.) are locations too, but not units.
 */
const UNIT_KIND = "יחידה";

export function UnitsPage() {
  const { data, error, loading, reload } = useAsync(() => api.locations.list());
  const units = useMemo(() => (data ?? []).filter((row) => row.kind === UNIT_KIND), [data]);

  const categories = useMemo(
    () => sortCategories(options(units, (row) => row.category)),
    [units],
  );
  const [category, setCategory] = useState("");
  const activeCategory = categories.includes(category) ? category : categories[0] ?? "";

  const visible = useMemo(
    () => (activeCategory ? units.filter((row) => row.category === activeCategory) : units),
    [units, activeCategory],
  );

  const groups = useMemo(() => groupByBrigade(visible), [visible]);
  const [open, setOpen] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{t.units.title}</h1>
          <p className="muted">{t.units.subtitle}</p>
        </div>
      </header>

      {error && <ErrorBanner error={error} onRetry={reload} />}
      {loading && <Spinner />}
      {data && units.length === 0 && <EmptyState message={t.units.empty} />}

      {units.length > 0 && (
        <div className="filters">
          <FilterChips
            label={t.locations.category}
            values={categories}
            selected={activeCategory}
            onSelect={setCategory}
          />
          <div className="filter-summary">
            <span className="muted small">{t.locations.showing(visible.length, units.length)}</span>
          </div>
        </div>
      )}

      {units.length > 0 && visible.length === 0 && <EmptyState message={t.units.noMatches} />}

      {visible.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.locations.name}</th>
                <th>{t.locations.battalion}</th>
                <th>{t.locations.contactName}</th>
                <th>{t.locations.contactPhone}</th>
              </tr>
            </thead>

            {groups.map((group) => (
              <tbody key={group.key}>
                <tr className="group-row">
                  <td colSpan={4}>
                    <button
                      className="group-toggle"
                      aria-expanded={open.has(group.key)}
                      onClick={() => toggle(group.key)}
                    >
                      <span className="chevron" aria-hidden="true">
                        {open.has(group.key) ? "▾" : "▸"}
                      </span>
                      <span className="group-name">{group.label}</span>
                      <span className="muted small">{t.locations.battalionCount(group.rows.length)}</span>
                    </button>
                  </td>
                </tr>

                {open.has(group.key) &&
                  group.rows.map((row) => (
                    <tr key={row.id}>
                      <td className="leaf-cell">
                        <Link to={`/units/${row.id}`}>
                          <strong>{row.name}</strong>
                        </Link>
                        {row.notes && <div className="muted small">{row.notes}</div>}
                      </td>
                      <td>{row.battalion ?? t.common.none}</td>
                      <td>{row.contact_name ?? t.common.none}</td>
                      <td>{row.contact_phone ?? t.common.none}</td>
                    </tr>
                  ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
    </>
  );
}

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

export function UnitDetailPage() {
  const { locationId } = useParams<{ locationId: string }>();
  const id = locationId!;

  const location = useAsync(() => api.locations.get(id), [id]);
  const items = useAsync(() => api.items.list({ locationId: id }), [id]);
  const projects = useAsync(() => api.projects.list(), []);

  if (location.loading || items.loading) return <Spinner />;
  if (location.error) return <ErrorBanner error={location.error} onRetry={location.reload} />;
  if (items.error) return <ErrorBanner error={items.error} onRetry={items.reload} />;
  if (!location.data) return <ErrorBanner error={t.units.notFound} />;

  const unit = location.data;
  const projectsById = new Map((projects.data ?? []).map((p) => [p.id, p]));
  const groups = groupByProject(items.data ?? [], projectsById);

  return (
    <>
      <Link to="/units" className="back-link">
        ← {t.common.back} {t.nav.units}
      </Link>

      <header className="page-header">
        <div>
          <h1>{unit.name}</h1>
          <p className="muted">
            {[unit.brigade, unit.battalion].filter(Boolean).join(" · ") || t.common.none}
          </p>
        </div>
      </header>

      <section className="section">
        <div className="section-header">
          <h2>
            {t.units.itemsTitle} <span className="count">{(items.data ?? []).length}</span>
          </h2>
        </div>

        {(items.data ?? []).length === 0 ? (
          <EmptyState message={t.units.itemsEmpty} />
        ) : (
          groups.map((group) => (
            <div className="project-group" key={group.projectId}>
              <div className="project-group-header">
                <h3>
                  {group.project ? (
                    <Link to={`/projects/${group.project.id}`}>{group.project.name}</Link>
                  ) : (
                    t.common.none
                  )}
                </h3>
                <span className="count">{group.items.length}</span>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t.projectItems.type}</th>
                      <th>{t.projectItems.model}</th>
                      <th>{t.projectItems.serialId}</th>
                      <th>{t.projectItems.status}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.type?.name ?? t.common.none}</td>
                        <td>{item.model?.name ?? t.common.none}</td>
                        <td>{item.serial_id ?? t.common.none}</td>
                        <td>
                          <Badge tone="grey">{item.status?.name ?? t.common.none}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </section>
    </>
  );
}
