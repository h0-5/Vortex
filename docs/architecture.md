# Phase 1 Architecture

## Boundaries

| Boundary            | Owns                                                   | Must not own in Phase 1             |
| ------------------- | ------------------------------------------------------ | ----------------------------------- |
| `apps/api`          | OAuth, sessions, users, guild access, REST transport   | Bot commands, plugins, themes       |
| `apps/bot`          | Discord connection and guild lifecycle synchronization | Commands, loaders, feature modules  |
| `apps/dashboard`    | Authentication UI and selected guild context           | Plugin/theme/marketplace navigation |
| `packages/database` | Foundation persistence schema                          | Feature-specific tables             |
| `packages/types`    | Runtime-validated API contracts                        | Framework-specific types            |
| `packages/shared`   | Environment and Discord primitives                     | Business workflows                  |
| `packages/ui`       | Reusable shadcn/ui source components                   | A runtime theme engine              |

## Authentication flow

1. The dashboard navigates to `GET /api/v1/auth/discord`.
2. The API creates state and a PKCE verifier in the server-side session.
3. Discord redirects to the API callback with an authorization code.
4. The API validates state and age, exchanges the code, and fetches the Discord user.
5. User identity is upserted and OAuth tokens are encrypted with AES-256-GCM.
6. The API rotates the session ID and redirects to `/dashboard`.
7. The browser receives only an opaque, HTTP-only session cookie.

## Permission foundation

`guild_members.role` stores one of:

- `OWNER`: derived from Discord ownership or synchronized by the bot.
- `ADMINISTRATOR`: derived from Discord's administrator permission bit.
- `MANAGER`: reserved for an explicit future assignment flow.

The API grants guild management access only when one of those roles is present. It does not infer
future plugin permissions or create a generic permission engine in Phase 1.

## Guild synchronization

The bot is authoritative for bot presence:

- `ready`: upserts every connected guild.
- `guildCreate`: marks the guild present.
- `guildDelete`: marks the guild absent without deleting history.

The OAuth API is authoritative for the current user's visible Discord guild list. It combines that
list with bot presence and stored role mappings for the dashboard response.

## Future extension rules

Future plugin, theme, marketplace, migration, SDK, and plugin-permission systems should be added as
new packages and modules. They should depend on stable foundation contracts rather than adding
feature awareness to the bot bootstrap, authentication flow, or shared UI primitives.

No Phase 1 module discovers, loads, registers, or renders future systems.
