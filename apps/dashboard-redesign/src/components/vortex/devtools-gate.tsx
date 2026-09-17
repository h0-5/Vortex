"use client";

import { useEffect } from "react";

/**
 * Only the platform owner may see the Next.js dev-tools overlay.
 * The portal (`<nextjs-portal>`) is injected by the Next dev runtime — it
 * never ships in production builds — but while running a dev/staging server
 * every visitor would normally see it. The decision is made from the real
 * server session (/api/v1/me → discordId), so the check is backend-driven:
 * owner keeps the tool, everyone else (and logged-out visitors) get it
 * force-hidden with a style rule that re-arms itself if the portal remounts.
 */
const OWNER_DISCORD_ID = "1251665502242213979";
const STYLE_ID = "vx-hide-devtools";
const CSS = "nextjs-portal{display:none !important;visibility:hidden !important;}";

export function DevToolsGate() {
  useEffect(() => {
    /* Production builds contain no dev portal at all — nothing to gate. */
    if (process.env.NODE_ENV !== "development") return;

    let style: HTMLStyleElement | null = null;
    let cancelled = false;

    const hide = () => {
      if (!style) {
        style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = CSS;
        document.head.appendChild(style);
      }
      const portal = document.querySelector("nextjs-portal") as HTMLElement | null;
      if (portal) portal.style.display = "none";
    };

    const show = () => {
      document.getElementById(STYLE_ID)?.remove();
      style = null;
      const portal = document.querySelector("nextjs-portal") as HTMLElement | null;
      if (portal) portal.style.display = "";
    };

    fetch("/api/v1/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => {
        if (cancelled) return;
        const discordId = String(user?.discordId ?? user?.id ?? "");
        if (discordId === OWNER_DISCORD_ID) show();
        else hide();
      })
      .catch(() => {
        if (!cancelled) hide();
      });

    /* The portal mounts after hydration and can be re-created — keep the
       rule armed and the inline display set whenever the DOM shifts. */
    const observer = new MutationObserver(() => {
      if (cancelled) return;
      if (!style) return;
      if (!document.getElementById(STYLE_ID) && style) {
        document.head.appendChild(style);
      }
      const portal = document.querySelector("nextjs-portal") as HTMLElement | null;
      if (portal && portal.style.display !== "none") portal.style.display = "none";
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      observer.disconnect();
      show();
    };
  }, []);

  return null;
}
