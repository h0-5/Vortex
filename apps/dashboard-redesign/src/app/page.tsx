"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { LoginScreen } from "@/components/vortex/login";
import { SelectServerScreen } from "@/components/vortex/select-server";
import { DashboardShell, type VortexView } from "@/components/vortex/shell";
import { ActivityView, OverviewView, PluginsView } from "@/components/vortex/views-workspace";
import { ApiView, LogsView, SettingsView } from "@/components/vortex/views-platform";
import {
  fetchActivity,
  fetchGuilds,
  fetchMe,
  fetchPlugins,
  logout as apiLogout,
  setPluginEnabled,
  type ActivityEvent,
  type Guild,
  type Plugin,
  type VortexUser,
} from "@/lib/vortex/data";

type Stage = "boot" | "login" | "select" | "app";

export default function Home() {
  const [stage, setStage] = useState<Stage>("boot");
  const [user, setUser] = useState<VortexUser | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [guild, setGuild] = useState<Guild | null>(null);
  const [view, setView] = useState<VortexView>("overview");
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        if (!me) {
          setStage("login");
          return;
        }
        setUser(me);
        const available = await fetchGuilds();
        if (cancelled) return;
        setGuilds(available);
        setStage("select");
      } catch (error) {
        if (cancelled) return;
        toast.error("Failed to reach the Vortex API", {
          description: error instanceof Error ? error.message : String(error),
        });
        setStage("login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = () => {
    window.location.href = "/api/v1/auth/discord";
  };

  const handleLogout = async () => {
    await apiLogout();
    setUser(null);
    setGuild(null);
    setGuilds([]);
    setPlugins([]);
    setActivity([]);
    setStage("login");
    toast("Session revoked", { description: "Session ID rotated server-side." });
  };

  const refreshWorkspace = async (guildId: string, initial: boolean) => {
    try {
      const [installed, events] = await Promise.all([
        fetchPlugins(guildId),
        fetchActivity(guildId),
      ]);
      setPlugins(installed);
      setActivity(events);
    } catch (error) {
      if (initial) {
        toast.error("Could not load workspace data", {
          description: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };

  const handleSelectGuild = (selected: Guild) => {
    setGuild(selected);
    setView("overview");
    setStage("app");
    toast.success(`Workspace opened — ${selected.name}`);
    void refreshWorkspace(selected.id, true);
  };

  const handleTogglePlugin = async (plugin: Plugin) => {
    if (!guild) return;
    const next = !plugin.enabled;
    setPlugins((prev) => prev.map((p) => (p.id === plugin.id ? { ...p, enabled: next } : p)));
    toast[next ? "success" : "warning"](
      `${plugin.name} ${next ? "enabled" : "disabled"}`,
      { description: next ? "Module loaded onto shard 0." : "Module unloaded from the runtime." },
    );
    try {
      await setPluginEnabled(guild.id, plugin.id, next);
    } catch (error) {
      setPlugins((prev) => prev.map((p) => (p.id === plugin.id ? { ...p, enabled: !next } : p)));
      toast.error(`Could not ${next ? "enable" : "disable"} ${plugin.name}`, {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  if (stage === "boot") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper">
        <Loader2Icon className="size-7 animate-spin text-primary" aria-hidden="true" />
        <p className="font-mono text-[12px] text-muted-foreground">Establishing secure session…</p>
      </div>
    );
  }

  if (stage === "login") {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (stage === "select" || !guild) {
    if (!user) return null;
    return (
      <SelectServerScreen
        user={user}
        guilds={guilds}
        onSelect={handleSelectGuild}
        onLogout={handleLogout}
      />
    );
  }

  if (!user) return null;

  return (
    <DashboardShell
      user={user}
      guild={guild}
      guilds={guilds}
      view={view}
      onViewChange={setView}
      onSwitchGuild={handleSelectGuild}
      onBrowseServers={() => setStage("select")}
      onLogout={handleLogout}
    >
      {view === "overview" && (
        <OverviewView
          guild={guild}
          plugins={plugins}
          activity={activity}
          onNavigate={setView}
          onQuickAction={(label) =>
            toast.info(label, { description: "Command queued to shard 0." })
          }
        />
      )}
      {view === "plugins" && (
        <PluginsView plugins={plugins} onToggle={handleTogglePlugin} guild={guild} user={user} />
      )}
      {view === "activity" && <ActivityView activity={activity} />}
      {view === "logs" && <LogsView guildId={guild.id} />}
      {view === "api" && <ApiView />}
      {view === "settings" && <SettingsView onLogout={handleLogout} />}
    </DashboardShell>
  );
}