import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { t } from "./i18n";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import { UnitsPage, UnitDetailPage } from "./pages/UnitsPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">◈</span>
          <span className="brand-name">{t.appName}</span>
        </div>
        <nav>
          <NavLink to="/projects">{t.nav.projects}</NavLink>
          <NavLink to="/units">{t.nav.units}</NavLink>
          <NavLink to="/settings">{t.nav.settings}</NavLink>
        </nav>
      </aside>

      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="/units" element={<UnitsPage />} />
          <Route path="/units/:locationId" element={<UnitDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}
