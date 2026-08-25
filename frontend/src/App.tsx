import { useCallback, useMemo } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api } from "./api";
import { initials, useSession } from "./auth";
import { Logo } from "./components/Logo";
import { usePointerGlow, useAsync } from "./hooks";
import { t } from "./i18n";
import { ShellProvider } from "./shellData";
import LoginPage from "./pages/LoginPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import { LocationsPage, LocationDetailPage } from "./pages/LocationsPage";
import FeedbackPage from "./pages/FeedbackPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  const { user, signIn, signOut } = useSession();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/projects" replace /> : <LoginPage onSignIn={signIn} />}
      />
      <Route
        path="/*"
        element={
          user ? <Shell user={user} onSignOut={signOut} /> : <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
}

/* ========================================================================
 * The signed-in shell: sidebar, the glowing main pane, and the routes.
 * ===================================================================== */
function Shell({ user, onSignOut }: { user: string; onSignOut: () => void }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { glowRef, onMouseMove, onMouseLeave } = usePointerGlow<HTMLElement>();

  const projects = useAsync(() => api.projects.list(), []);
  const locations = useAsync(() => api.locations.list(), []);
  const feedback = useAsync(() => api.feedback.list(), []);

  const reloadAll = useCallback(() => {
    projects.reload();
    locations.reload();
    feedback.reload();
  }, [projects.reload, locations.reload, feedback.reload]);

  const shell = useMemo(
    () => ({ user, projects, locations, feedback, reloadAll }),
    [user, projects, locations, feedback, reloadAll],
  );

  // Archived projects are out of sight on the list, so they are out of the
  // sidebar count too.
  const activeProjects = (projects.data ?? []).filter((p) => p.status !== "archived");
  const overdueLoans = activeProjects.reduce((sum, p) => sum + p.overdue_count, 0);
  const overdueProjects = activeProjects.filter((p) => p.overdue_count > 0).length;

  const onSettings = pathname.startsWith("/settings");

  return (
    <ShellProvider value={shell}>
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <Logo size={52} />
            <div className="brand-name">
              {t.appNameLines[0]}
              <br />
              {t.appNameLines[1]}
            </div>
          </div>

          <nav>
            <NavItem to="/projects" label={t.nav.projects} count={activeProjects.length} />
            <NavItem to="/locations" label={t.nav.locations} count={(locations.data ?? []).length} />
            <NavItem to="/feedback" label={t.nav.feedback} count={(feedback.data ?? []).length} />
          </nav>

          <div className="sidebar-foot">
            <div className="overdue-callout">
              <div className="overdue-callout-label">{t.shell.overdueTitle}</div>
              <div className="overdue-callout-value">
                <strong className="num">{overdueLoans}</strong>
                <span>{t.shell.overdueScope(overdueProjects)}</span>
              </div>
            </div>

            <div className="user-row">
              <span className="avatar" aria-hidden="true">
                {initials(user)}
              </span>
              <div className="user-name">
                {user}
                <div className="user-role">{t.auth.role}</div>
              </div>
              <div className="user-actions">
                <button
                  className={`gear-btn${onSettings ? " active" : ""}`}
                  title={t.shell.settings}
                  aria-label={t.shell.settings}
                  onClick={() => navigate("/settings")}
                >
                  <GearIcon />
                </button>
                <a
                  href="/login"
                  className="sign-out"
                  onClick={(e) => {
                    e.preventDefault();
                    onSignOut();
                  }}
                >
                  {t.shell.signOut}
                </a>
              </div>
            </div>
          </div>
        </aside>

        <main className="content" onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
          <div ref={glowRef} className="content-glow" aria-hidden="true" />

          <Routes>
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/locations/:locationId" element={<LocationDetailPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* The units routes moved to /locations when it became a screen of its own. */}
            <Route path="/units" element={<Navigate to="/locations" replace />} />
            <Route path="/units/:locationId" element={<Navigate to="/locations" replace />} />
          </Routes>
        </main>
      </div>
    </ShellProvider>
  );
}

/** Nav row: label at the reading edge, count pushed to the other one. */
function NavItem({ to, label, count }: { to: string; label: string; count: number }) {
  return (
    <NavLink to={to} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
      <span>{label}</span>
      <span className="nav-count num">{count}</span>
    </NavLink>
  );
}

function GearIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#47506B"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
