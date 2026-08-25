import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useAsync } from "../hooks";
import { formatRelative, itemLabel, t } from "../i18n";
import { options, sortCategories } from "../locationGrouping";
import { affiliation, buildLocationStats, emptyStats } from "../locationStats";
import type { LocationStats } from "../locationStats";
import { useShell } from "../shellData";
import { LocationFormModal } from "../components/LocationFormModal";
import {
  EmptyState,
  ErrorBanner,
  FilterChips,
  Pill,
  Spinner,
  Stars,
} from "../components/ui";
import type { Item, Location, ProjectSummary } from "../types";

/* ========================================================================
 * The directory: every location on the left, a drill-down on the right.
 * ===================================================================== */
export function LocationsPage() {
  const shell = useShell();
  const { data, error, loading, reload } = shell.locations;

  // The numbers beside each location are folded together here — see locationStats.
  const items = useAsync(() => api.items.list(), []);
  const loans = useAsync(() => api.loans.list(), []);
  const stats = useMemo(
    () => buildLocationStats(items.data ?? [], loans.data ?? [], shell.feedback.data ?? []),
    [items.data, loans.data, shell.feedback.data],
  );

  // The full directory runs to a few hundred rows, so it opens with the two
  // filters the rest of the app narrows locations by.
  const [kind, setKind] = useState("");
  const [category, setCategory] = useState("");
  const all = data ?? [];

  const kinds = useMemo(
    () => [
      { key: "", label: t.common.all },
      ...options(all, (row) => row.kind).map((value) => ({ key: value, label: value })),
    ],
    [all],
  );

  const categories = useMemo(() => {
    const inKind = kind ? all.filter((row) => row.kind === kind) : all;
    return [
      { key: "", label: t.common.all },
      ...sortCategories(options(inKind, (row) => row.category)).map((value) => ({
        key: value,
        label: value,
      })),
    ];
  }, [all, kind]);

  const visible = useMemo(
    () =>
      all.filter(
        (row) => (!kind || row.kind === kind) && (!category || row.category === category),
      ),
    [all, kind, category],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  // A row that has been filtered away cannot stay selected.
  const selected = visible.find((row) => row.id === selectedId) ?? visible[0] ?? null;
  const [creating, setCreating] = useState(false);

  function selectKind(next: string) {
    setKind(next);
    // The chosen category may not exist under the new kind.
    const stillValid = (next ? all.filter((row) => row.kind === next) : all).some(
      (row) => row.category === category,
    );
    if (!stillValid) setCategory("");
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{t.locations.title}</h1>
          <p className="subtitle">{t.locations.subtitle}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          + {t.locations.new}
        </button>
      </header>

      {error && <ErrorBanner error={error} onRetry={reload} />}
      {items.error && <ErrorBanner error={items.error} onRetry={items.reload} />}
      {loans.error && <ErrorBanner error={loans.error} onRetry={loans.reload} />}
      {loading && <Spinner />}
      {data && all.length === 0 && <EmptyState message={t.locations.empty} />}

      {all.length > 0 && (
        <>
          <FilterChips
            label={t.locations.kind}
            values={kinds}
            selected={kind}
            onSelect={selectKind}
          />
          {categories.length > 2 && (
            <FilterChips
              label={t.locations.category}
              values={categories}
              selected={category}
              onSelect={setCategory}
            />
          )}
        </>
      )}

      {all.length > 0 && visible.length === 0 && <EmptyState message={t.locations.noMatches} />}

      {visible.length > 0 && (
        <div className="split split-locations">
          <div className="table-card">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t.locations.name}</th>
                    <th>{t.locations.kind}</th>
                    <th>{t.locations.affiliation}</th>
                    <th>{t.locations.itemCount}</th>
                    <th>{t.locations.openLoans}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => {
                    const stat = stats.get(row.id) ?? emptyStats();
                    return (
                      <tr
                        key={row.id}
                        className={`selectable${selected?.id === row.id ? " row-selected" : ""}`}
                        onClick={() => setSelectedId(row.id)}
                      >
                        <td className="strong">{row.name}</td>
                        <td style={{ color: "var(--slate)" }}>{row.kind ?? t.common.none}</td>
                        <td style={{ color: "var(--slate)" }}>
                          {affiliation(row) || t.common.none}
                        </td>
                        <td className="num">{stat.itemCount}</td>
                        <td
                          className="num strong"
                          style={{ color: stat.overdue > 0 ? "var(--red)" : undefined }}
                        >
                          {stat.openLoans}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {selected && <LocationPanel location={selected} stats={stats.get(selected.id)} />}
        </div>
      )}

      {creating && (
        <LocationFormModal
          location={null}
          onClose={() => setCreating(false)}
          onSaved={(saved) => {
            setCreating(false);
            setSelectedId(saved.id);
            reload();
          }}
        />
      )}
    </>
  );
}

function LocationPanel({
  location,
  stats,
}: {
  location: Location;
  stats: LocationStats | undefined;
}) {
  const stat = stats ?? emptyStats();
  const sub = [location.kind, affiliation(location)].filter(Boolean).join(" · ");

  return (
    <aside className="panel">
      <div className="panel-title">{location.name}</div>
      <div className="panel-sub">{sub || t.common.none}</div>

      <div className="panel-stats">
        <div className="panel-stat">
          <div className="label">{t.locations.itemsHere}</div>
          <div className="value num">{stat.itemCount}</div>
        </div>
        <div className="panel-stat">
          <div className="label">{t.locations.overdue}</div>
          <div className={`value num${stat.overdue > 0 ? " alert" : ""}`}>{stat.overdue}</div>
        </div>
      </div>

      <div className="panel-block">
        <div className="section-label">{t.locations.contact}</div>
        <div className="panel-contact">
          {location.contact_name ?? t.common.none}
          <div className="num" style={{ color: "var(--slate)" }}>
            {location.contact_phone ?? t.common.none}
          </div>
        </div>
      </div>

      <div className="panel-block">
        <div className="section-label">{t.locations.stock}</div>
        {stat.stock.length === 0 ? (
          <p className="muted small">{t.locations.stockEmpty}</p>
        ) : (
          <div className="stock-list">
            {stat.stock.map((row) => (
              <div className="stock-row" key={row.label}>
                <span>{row.label}</span>
                <span className="muted num">{row.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel-block">
        <div className="section-label">{t.locations.lastFeedback}</div>
        {stat.lastFeedback ? (
          <>
            <p className="panel-quote">{stat.lastFeedback.content}</p>
            <div className="panel-quote-when">
              <Stars value={stat.lastFeedback.rating} />{" "}
              {formatRelative(stat.lastFeedback.feedback_at)}
            </div>
          </>
        ) : (
          <p className="muted small">{t.locations.lastFeedbackEmpty}</p>
        )}
      </div>

      <Link className="btn btn-secondary" to={`/locations/${location.id}`}>
        {t.locations.openDetail}
      </Link>
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

  const location = useAsync(() => api.locations.get(id), [id]);
  const items = useAsync(() => api.items.list({ locationId: id }), [id]);

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
        </div>
      </header>

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
