import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { t } from "../i18n";
import { useShell } from "../shellData";
import { Tabs } from "../components/ui";
import ActivityPage from "./ActivityPage";
import AccessPage from "./AccessPage";

type Tab = "activity" | "access";

/* ========================================================================
 * Settings — reached from the gear at the foot of the nav bar. Two tabs
 * under one header: the activity log (everyone) and the allowlist (admins).
 * ===================================================================== */
export default function SettingsPage() {
  const { isAdmin } = useShell();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const tab: Tab = pathname.endsWith("/access") ? "access" : "activity";

  // The allowlist tab is admins only; the API enforces it too, this just keeps
  // a typed-in address from showing a screen every call on it would refuse.
  useEffect(() => {
    if (tab === "access" && !isAdmin) navigate("/settings/activity", { replace: true });
  }, [tab, isAdmin, navigate]);

  const tabs = [
    { key: "activity" as const, label: t.settings.tabs.activity },
    ...(isAdmin ? [{ key: "access" as const, label: t.settings.tabs.access }] : []),
  ];

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{t.settings.title}</h1>
          <p className="subtitle">{t.settings.subtitle}</p>
        </div>
      </header>

      {tabs.length > 1 && (
        <Tabs<Tab>
          tabs={tabs}
          active={tab}
          onSelect={(key) => navigate(`/settings/${key}`)}
        />
      )}

      {tab === "access" && isAdmin ? <AccessPage /> : <ActivityPage />}
    </>
  );
}
