# Vortex — Dashboard Redesign (OLED Edition)

Standalone Next.js 16 dashboard for the Vortex Discord bot platform.
Dark Mode OLED design system: pure black canvas, Plus Jakarta Sans + Fira Code,
violet->cyan brand gradient matching the approved blade-V logo.

## Run

```bash
bun install   # or: npm install / pnpm install
bun run dev   # http://localhost:3000
```

## Structure

- src/app/            App Router entry (single-route SPA: login -> server select -> dashboard)
- src/components/vortex/  login, select-server, shell (sidebar/topbar/command palette), views
- src/lib/vortex/     data layer (mock of Phase-1 API contracts: /me, /guilds, plugins)
- public/vortex-mark.png  brand mark (used in UI + favicon)

## Notes

- Demo mode: auth and data are mocked client-side (700ms fake OAuth).
- To wire to the real NestJS API, replace the mock layer in src/lib/vortex/data.ts
  with fetch calls to /api/v1 (same contracts as apps/api in the Vortex monorepo).
