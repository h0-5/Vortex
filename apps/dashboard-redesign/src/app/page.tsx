"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LoginScreen } from "@/components/vortex/login";
import { SelectServerScreen } from "@/components/vortex/select-server";
import { DashboardShell, type VortexView } from "@/components/vortex/shell";
import { ActivityView, OverviewView, PluginsView } from "@/components/vortex/views-workspace";
import { ApiView, LogsView, SettingsView } from "@/components/vortex/views-platform";
import {
  MOCK_ACTIVITY,
  MOCK_GUILDS,
  MOCK_PLUGINS,
  MOCK_USER,
  type Guild,
  type Plugin,
} from "@/lib/vortex/data";

type Stage = "login" | "select" | "app";

export default function Home() {
  const [stage, setStage] = useState<Stage>("login");
  const [user] = useState(MOCK_USER);
  const [guild, setGuild] = useState<Guild | null>(null);
  const [view, setView] = useState<VortexView>("overview");
  const [plugins, setPlugins] = useState<Plugin[]>(MOCK_PLUGINS);

  const handleLogin = () => {
    setStage("select");
    toast.success("Session established", { description: "Opaque HTTP-only cookie issued." });
  };

  const handleSelectGuild = (selected: Guild) => {
    setGuild(selected);
    setView("overview");
    setStage("app");
    toast.success(`Workspace opened — ${selected.name}`);
  };

  const handleTogglePlugin = (plugin: Plugin) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === plugin.id ? { ...p, enabled: !p.enabled } : p)),
    );
    toast[plugin.enabled ? "warning" : "success"](
      `${plugin.name} ${plugin.enabled ? "disabled" : "enabled"}`,
      { description: plugin.enabled ? "Module unloaded from the runtime." : "Module loaded onto shard 0." },
    );
  };

  if (stage === "login") {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (stage === "select" || !guild) {
    return (
      <SelectServerScreen
        user={user}
        guilds={MOCK_GUILDS}
        onSelect={handleSelectGuild}
        onLogout={() => setStage("login")}
      />
    );
  }

  return (
    <DashboardShell
      user={user}
      guild={guild}
      guilds={MOCK_GUILDS}
      view={view}
      onViewChange={setView}
      onSwitchGuild={handleSelectGuild}
      onBrowseServers={() => setStage("select")}
      onLogout={() => {
        setStage("login");
        toast("Session revoked", { description: "Session ID rotated server-side." });
      }}
    >
      {view === "overview" && (
        <OverviewView
          guild={guild}
          plugins={plugins}
          activity={MOCK_ACTIVITY}
          onNavigate={setView}
          onQuickAction={(label) =>
            toast.info(`${label}`, { description: "Command queued to shard 0." })
          }
        />
      )}
      {view === "plugins" && <PluginsView plugins={plugins} onToggle={handleTogglePlugin} />}
      {view === "activity" && <ActivityView activity={MOCK_ACTIVITY} />}
      {view === "logs" && <LogsView />}
      {view === "api" && <ApiView />}
      {view === "settings" && (
        <SettingsView
          onLogout={() => {
            setStage("login");
            toast("Session revoked", { description: "Session ID rotated server-side." });
          }}
        />
      )}
    </DashboardShell>
  );
}
