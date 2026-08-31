import { useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useMatch } from "react-router-dom";
import { api } from "./api";
import { initials, useSession } from "./auth";
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
import type { ProjectSummary, User } from "./types";

export default function App() {
  const { user, signIn, signOut, refresh } = useSession();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/projects" replace /> : <LoginPage onSignIn={signIn} />}
      />
      <Route
        path="/*"
        element={
          user ? (
            <Shell user={user} onSignOut={signOut} onUserChanged={refresh} />
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
  onSignOut,
  onUserChanged,
}: {
  user: User;
  onSignOut: () => void;
  onUserChanged: (user: User) => void;
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
    () => ({ user, projects, items, locations, feedback, reloadAll, refresh: onUserChanged }),
    [user, projects, items, locations, feedback, reloadAll, onUserChanged],
  );

  // Archived projects are out of sight on the list, so they are out of the
  // nav count too.
  const activeProjects = (projects.data ?? []).filter((p) => p.status !== "archived");

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
            <span className="avatar" title={t.users.roles[user.role]} aria-hidden="true">
              {initials(user.username)}
            </span>
            <div className="user">
              <div className="user-name">{user.full_name || user.username}</div>
              <div className="user-role">{t.users.roles[user.role]}</div>
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
              {/* One component behind both tabs — see SettingsPage. */}
              <Route path="/settings/*" element={<SettingsPage />} />
              {/* The units routes moved to /locations when it became a screen of its own. */}
              <Route path="/units" element={<Navigate to="/locations" replace />} />
              <Route path="/units/:locationId" element={<Navigate to="/locations" replace />} />
              {/* Equipment, locations and statuses each moved out to a screen
                  of their own; what is left under Settings is users and the
                  activity log. */}
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

  // Only the project screen has a leaf: its name comes off the list the shell
  // already fetched rather than a second request, so while that list is still
  // in flight the crumb is just the section and fills in when it lands.
  const leaf =
    project ? ((projects ?? []).find((p) => p.id === project.params.projectId)?.name ?? "")
    : section === "settings" ?
      pathname.endsWith("/activity") ? t.settings.tabs.activity
      : t.settings.tabs.users
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

/** Nav row: icon and label at the reading edge, count pushed to the other one. */
function NavItem({
  to,
  label,
  count,
  icon,
}: {
  to: string;
  label: string;
  count: number;
  icon: ReactNode;
}) {
  return (
    <NavLink to={to} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
      <span className="nav-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="nav-label">{label}</span>
      <span className="nav-count num">{count}</span>
    </NavLink>
  );
}
