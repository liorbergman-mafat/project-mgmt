import { useCallback, useMemo, type ReactNode } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { api } from "./api";
import { initials, useSession } from "./auth";
import { Logo } from "./components/Logo";
import { usePointerGlow, useAsync } from "./hooks";
import { t } from "./i18n";
import { ShellProvider } from "./shellData";
import LoginPage from "./pages/LoginPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import EquipmentPage from "./pages/EquipmentPage";
import { LocationsPage, LocationDetailPage } from "./pages/LocationsPage";
import FeedbackPage from "./pages/FeedbackPage";

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
 * The signed-in shell: the top navigation bar, the main pane, and the routes.
 * ===================================================================== */
function Shell({ user, onSignOut }: { user: string; onSignOut: () => void }) {
  const { glowRef, onMouseMove, onMouseLeave } = usePointerGlow<HTMLElement>();

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
    () => ({ user, projects, items, locations, feedback, reloadAll }),
    [user, projects, items, locations, feedback, reloadAll],
  );

  // Archived projects are out of sight on the list, so they are out of the
  // nav count too.
  const activeProjects = (projects.data ?? []).filter((p) => p.status !== "archived");

  return (
    <ShellProvider value={shell}>
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <Logo size={44} />
            <div className="brand-name">{t.appName}</div>
          </div>

          <nav>
            <NavItem
              to="/projects"
              label={t.nav.projects}
              count={activeProjects.length}
              icon={<ProjectsIcon />}
            />
            <NavItem
              to="/equipment"
              label={t.nav.equipment}
              count={(items.data ?? []).length}
              icon={<EquipmentIcon />}
            />
            <NavItem
              to="/locations"
              label={t.nav.locations}
              count={(locations.data ?? []).length}
              icon={<LocationsIcon />}
            />
            <NavItem
              to="/feedback"
              label={t.nav.feedback}
              count={(feedback.data ?? []).length}
              icon={<FeedbackIcon />}
            />
          </nav>

          <div className="topbar-user">
            {/* The role is the only thing the bar has no room to spell out. */}
            <span className="avatar" title={t.auth.role} aria-hidden="true">
              {initials(user)}
            </span>
            <div className="user-name">{user}</div>
            <a
              href="/login"
              className="sign-out"
              onClick={(e) => {
                e.preventDefault();
                onSignOut();
              }}
            >
              <SignOutIcon />
              {t.shell.signOut}
            </a>
          </div>
        </header>

        <main className="content" onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
          <div ref={glowRef} className="content-glow" aria-hidden="true" />

          <Routes>
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
            <Route path="/equipment" element={<EquipmentPage />} />
            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/locations/:locationId" element={<LocationDetailPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            {/* The units routes moved to /locations when it became a screen of its own. */}
            <Route path="/units" element={<Navigate to="/locations" replace />} />
            <Route path="/units/:locationId" element={<Navigate to="/locations" replace />} />
            {/* Settings was split up: equipment, locations and statuses are each managed on their own screen now. */}
            <Route path="/settings" element={<Navigate to="/equipment" replace />} />
          </Routes>
        </main>
      </div>
    </ShellProvider>
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

/* ------------------------------------------------------------------------
 * Nav glyphs. Outline style, 20px on a 24 grid, stroked in `currentColor`
 * so each one takes the colour of the nav row it sits in.
 * --------------------------------------------------------------------- */
function NavGlyph({ children }: { children: ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Stacked layers — a set of projects. */
function ProjectsIcon() {
  return (
    <NavGlyph>
      <path d="M12 3 3 7.5l9 4.5 9-4.5L12 3Z" />
      <path d="M3 12.5 12 17l9-4.5" />
      <path d="M3 17 12 21.5 21 17" />
    </NavGlyph>
  );
}

/** An open crate — the equipment catalogue. */
function EquipmentIcon() {
  return (
    <NavGlyph>
      <path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" />
      <path d="M3 8.5V16l9 4.5 9-4.5V8.5" />
      <path d="M12 13v7.5" />
    </NavGlyph>
  );
}

/** Map pin — a place equipment can sit. */
function LocationsIcon() {
  return (
    <NavGlyph>
      <path d="M20 10.5c0 5.2-8 11-8 11s-8-5.8-8-11a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10.5" r="2.8" />
    </NavGlyph>
  );
}

/** Speech bubble — what came back from the field. */
function FeedbackIcon() {
  return (
    <NavGlyph>
      <path d="M20.5 12.5a7.5 7.5 0 0 1-10.9 6.7L4 20.5l1.4-5.2A7.5 7.5 0 1 1 20.5 12.5Z" />
      <path d="M9 11.5h6M9 14.5h3.5" />
    </NavGlyph>
  );
}

/**
 * Leaving through the door. Drawn pointing at the inline end of a right-to-left
 * line — the direction the reader leaves in — rather than mirrored at runtime.
 */
function SignOutIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M8 8 4 12l4 4" />
      <path d="M4 12h10" />
    </svg>
  );
}
