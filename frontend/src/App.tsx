import { useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useMatch } from "react-router-dom";
import { api } from "./api";
import { initials, useSession } from "./auth";
import type { SessionUser } from "./auth";
import { supabaseConfigured } from "./supabase";
import { ParentMark } from "./components/ParentMark";
import {
  EquipmentIcon,
  FeedbackIcon,
  LocationsIcon,
  ProjectsIcon,
  SettingsIcon,
  SignOutIcon,
} from "./components/icons";
import { useAsync } from "./hooks";
import { t } from "./i18n";
import { ShellProvider } from "./shellData";
import LoginPage from "./pages/LoginPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import EquipmentPage from "./pages/EquipmentPage";
import { LocationsPage, LocationDetailPage } from "./pages/LocationsPage";
import FeedbackPage from "./pages/FeedbackPage";
import SettingsPage from "./pages/SettingsPage";
import type { ProjectSummary } from "./types";

export default function App() {
  const { user, loading, authorized, authError, isAdmin, signInWithGoogle, signOut } = useSession();

  // No Supabase env in this build — sign-in cannot work. Say so instead of
  // rendering a login screen whose button does nothing.
  if (!supabaseConfigured) return <ConfigError />;

  // Reading the stored session is near-instant; this just avoids a flash of the
  // login screen before it resolves.
  if (loading) return null;

  const ready = !!user && authorized === true;

  const login = (
    <LoginPage
      onGoogle={signInWithGoogle}
      onSignOut={signOut}
      checking={!!user && authorized === null}
      blocked={!!user && authorized === false}
      blockedReason={authError}
    />
  );

  return (
    <Routes>
      <Route path="/login" element={ready ? <Navigate to="/projects" replace /> : login} />
      <Route
        path="/*"
        element={
          ready && user ? (
            <Shell user={user} isAdmin={isAdmin} onSignOut={signOut} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

/* ========================================================================
 * The signed-in shell: the nav sidebar on the reading edge, a thin top bar
 * over the main pane, and the routes.
 * ===================================================================== */
function Shell({
  user,
  isAdmin,
  onSignOut,
}: {
  user: SessionUser;
  isAdmin: boolean;
  onSignOut: () => void;
}) {
  const projects = useAsync(() => api.projects.list(), []);
  const items = useAsync(() => api.items.list(), []);
  const locations = useAsync(() => api.locations.list(), []);
  const feedback = useAsync(() => api.feedback.list(), []);

  const reloadAll = useCallback(() => {
    projects.reload();
    items.reload();
    locations.reload();
    feedback.reload();
  }, [projects.reload, items.reload, locations.reload, feedback.reload]);

  const shell = useMemo(
    () => ({ user, isAdmin, projects, items, locations, feedback, reloadAll }),
    [user, isAdmin, projects, items, locations, feedback, reloadAll],
  );

  // Archived projects are out of sight on the list, so they are out of the
  // nav count too.
  const activeProjects = (projects.data ?? []).filter((p) => p.status !== "archived");

  const role = isAdmin ? t.auth.adminRole : t.auth.role;

  return (
    <ShellProvider value={shell}>
      <div className="app">
        <aside className="sidebar">
          {/* The app sets its name in text — the only mark it shows is the
              מנהלת's, in the far corner of the top bar. */}
          <div className="sidebar-brand">
            <div>
              <div className="brand-name">{t.appName}</div>
              <div className="brand-sub">{t.auth.title}</div>
            </div>
          </div>

          <nav>
            <NavItem
              to="/projects"
              label={t.nav.projects}
              count={activeProjects.length}
              icon={<ProjectsIcon size={17} />}
            />
            <NavItem
              to="/equipment"
              label={t.nav.equipment}
              count={(items.data ?? []).length}
              icon={<EquipmentIcon size={17} />}
            />
            <NavItem
              to="/locations"
              label={t.nav.locations}
              count={(locations.data ?? []).length}
              icon={<LocationsIcon size={17} />}
            />
            <NavItem
              to="/feedback"
              label={t.nav.feedback}
              count={(feedback.data ?? []).length}
              icon={<FeedbackIcon size={17} />}
            />
          </nav>

          <div className="sidebar-footer">
            <span className="avatar" title={role} aria-hidden="true">
              {initials(user.name)}
            </span>
            <div className="user">
              <div className="user-name">{user.name}</div>
              <div className="user-role">{role}</div>
            </div>
            {/* Settings and sign-out are the two things you do *to* the
                session rather than inside it, so they share its corner. */}
            <NavLink
              to="/settings"
              className={({ isActive }) => `footer-btn${isActive ? " active" : ""}`}
              title={t.nav.settings}
              aria-label={t.nav.settings}
            >
              <SettingsIcon />
            </NavLink>
            <button
              type="button"
              className="footer-btn"
              title={t.shell.signOut}
              aria-label={t.shell.signOut}
              onClick={onSignOut}
            >
              <SignOutIcon />
            </button>
          </div>
        </aside>

        <div className="shell-main">
          <header className="topbar">
            <Breadcrumb projects={projects.data} />
            {/* Mark and unit name are one lockup — see the login screen. */}
            <div className="topbar-lockup">
              <ParentMark className="topbar-mark" />
              <div className="topbar-unit">AI &amp; Autonomy</div>
            </div>
          </header>

          <main className="content">
            <Routes>
              <Route path="/" element={<Navigate to="/projects" replace />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
              <Route path="/equipment" element={<EquipmentPage />} />
              <Route path="/locations" element={<LocationsPage />} />
              <Route path="/locations/:locationId" element={<LocationDetailPage />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              {/* One component behind both tabs — see SettingsPage. The
                  allowlist tab guards itself; the API enforces it for real. */}
              <Route path="/settings" element={<Navigate to="/settings/activity" replace />} />
              <Route path="/settings/*" element={<SettingsPage />} />
              {/* Old standalone paths, kept so existing links still land. */}
              <Route path="/activity" element={<Navigate to="/settings/activity" replace />} />
              <Route path="/access" element={<Navigate to="/settings/access" replace />} />
              {/* The units routes moved to /locations when it became a screen of its own. */}
              <Route path="/units" element={<Navigate to="/locations" replace />} />
              <Route path="/units/:locationId" element={<Navigate to="/locations" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </ShellProvider>
  );
}

/**
 * Where you are, in the top bar: the section, and — on a detail screen — the
 * record inside it. The leaf name is read off the list the shell already
 * fetched rather than fetched again; while that list is still in flight the
 * crumb is just the section, and fills in when it lands.
 */
function Breadcrumb({ projects }: { projects: ProjectSummary[] | null }) {
  const { pathname } = useLocation();
  const project = useMatch("/projects/:projectId");

  const section = pathname.split("/")[1] ?? "";
  const root =
    section === "equipment" ? t.nav.equipment
    : section === "locations" ? t.nav.locations
    : section === "feedback" ? t.nav.feedback
    : section === "settings" ? t.nav.settings
    : t.nav.projects;

  // Only the project screen and Settings have a leaf. The project's name comes
  // off the list the shell already fetched rather than a second request, so
  // while that list is still in flight the crumb is just the section.
  const leaf =
    project ? ((projects ?? []).find((p) => p.id === project.params.projectId)?.name ?? "")
    : section === "settings" ?
      pathname.endsWith("/access") ? t.settings.tabs.access
      : t.settings.tabs.activity
    : "";

  return (
    <div className="crumb">
      <span>{root}</span>
      {leaf && (
        <>
          <span className="crumb-sep" aria-hidden="true">
            /
          </span>
          <span className="crumb-leaf">{leaf}</span>
        </>
      )}
    </div>
  );
}

/** Shown when the build has no Supabase env — a dead end, but a legible one. */
function ConfigError() {
  return (
    <div style={{ maxWidth: 640, margin: "15vh auto", padding: "0 24px", direction: "rtl" }}>
      <h1 style={{ fontSize: 20 }}>המערכת אינה מוגדרת</h1>
      <p style={{ color: "#555", lineHeight: 1.7 }}>
        משתני הסביבה <code>VITE_SUPABASE_URL</code> ו־<code>VITE_SUPABASE_ANON_KEY</code> חסרים
        בבנייה הזו, ולכן ההתחברות אינה אפשרית. יש להגדיר אותם ב־<code>frontend/.env</code>{" "}
        (הרצה מקומית) או במשתני הסביבה של פרויקט ה־Vercel, ואז לבנות מחדש.
      </p>
    </div>
  );
}

/** Nav row: icon and label at the reading edge, count pushed to the other one. */
function NavItem({
  to,
  label,
  count,
  icon,
}: {
  to: string;
  label: string;
  count?: number;
  icon: ReactNode;
}) {
  return (
    <NavLink to={to} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
      <span className="nav-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="nav-label">{label}</span>
      {count !== undefined && <span className="nav-count num">{count}</span>}
    </NavLink>
  );
}
