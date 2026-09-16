# Vortex

Vortex is an open-source Discord bot platform. This repository contains the Phase 1 core
foundation only: Discord authentication, user and guild context, PostgreSQL persistence, and the
Discord bot runtime.

Phase 1 intentionally contains no plugin system, theme system, marketplace, or Discord feature
modules.

## Architecture

```text
apps/
  api/        NestJS REST API and Discord OAuth
  bot/        discord.js core runtime
  dashboard/  React and Vite dashboard
packages/
  database/   Drizzle schema, client, and migrations
  shared/     Environment and Discord primitives
  types/      Runtime-validated API contracts
  ui/         Shared shadcn/ui source components
```

The dashboard uses relative `/api/v1` URLs. Vite proxies them to the API during development.
Production deployments should route `/api` to the API service on the same site as the dashboard.

See [docs/architecture.md](docs/architecture.md) for boundaries and future extension rules.

## Requirements

- Node.js 22 LTS
- pnpm 11.6+
- PostgreSQL 17+
- A Discord application with a bot user

## Local setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env` and set the Discord credentials.

3. Generate secure secrets:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

   Use the first value for `SESSION_SECRET` and the second for
   `OAUTH_TOKEN_ENCRYPTION_KEY`.

4. In the Discord Developer Portal, add this OAuth redirect:

   ```text
   http://localhost:4000/api/v1/auth/discord/callback
   ```

5. Start PostgreSQL and apply the migration:

   ```bash
   docker compose up -d postgres
   pnpm db:migrate
   ```

6. Start the API, bot, and dashboard:

   ```bash
   pnpm dev
   ```

Dashboard: `http://localhost:5173`  
API health: `http://localhost:4000/api/v1/health`  
Swagger UI: `http://localhost:4000/api/docs`

## Commands

```bash
pnpm build
pnpm lint
pnpm test
pnpm typecheck
pnpm format:check
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

## Authentication security

- OAuth Authorization Code flow with PKCE and state validation
- Server-side PostgreSQL sessions with opaque, HTTP-only cookies
- Session ID rotation after login
- AES-256-GCM encryption for Discord access and refresh tokens
- Refresh-token rotation before access-token expiry
- Same-origin enforcement for state-changing requests
- Environment validation with Zod

## API

The versioned REST contract is documented in [docs/openapi.yaml](docs/openapi.yaml).

- `GET /api/v1/me`
- `GET /api/v1/guilds`
- `GET /api/v1/guilds/{guildId}`
- `GET /api/v1/auth/discord`
- `GET /api/v1/auth/discord/callback`
- `POST /api/v1/auth/logout`
