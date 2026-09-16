# Updating Vortex

Vortex ships with a built-in, production-grade updater. It uses GitHub Releases and works inside the Pterodactyl console without requiring SSH, `git`, or manual file management.

## Table of Contents

- [Automatic Update](#automatic-update)
- [Manual Update](#manual-update)
- [Command-Line Flags](#command-line-flags)
- [What Is Protected](#what-is-protected)
- [Rollback](#rollback)
- [Dashboard Updates](#dashboard-updates)
- [Troubleshooting](#troubleshooting)

## Automatic Update

From your Pterodactyl console or terminal, run:

```bash
pnpm update:vortex
```

Or, if you prefer to call Node directly:

```bash
node update.js
```

The updater will:

1. Read the current version from `package.json`.
2. Query the latest release from `https://github.com/h05/Vortex/releases`.
3. Compare versions using semantic versioning.
4. Create a timestamped backup in `backups/YYYY-MM-DD-HH-mm-ss/`.
5. Download and extract the release zip to `.tmp-update/`.
6. Replace official Vortex files while preserving user data.
7. Run `pnpm install --frozen-lockfile`.
8. Run `pnpm db:migrate`.
9. Run `pnpm build`.
10. Validate the installation.
11. Print an update report.

If any step fails, the updater automatically restores the previous version from the backup and prints a rollback report.

## Manual Update

Manual updates are **not recommended** for production environments. If you must perform one:

1. Stop Vortex (`Ctrl+C` if running).
2. Create a manual backup of `.env`, `uploads/`, `storage/`, and any custom plugins.
3. Download the latest release zip from GitHub.
4. Extract it over your installation, but **never overwrite** `.env`, `uploads/`, `storage/`, or `plugins/custom/`.
5. Run `pnpm install --frozen-lockfile`.
6. Run `pnpm db:migrate`.
7. Run `pnpm build`.
8. Start Vortex with `node index.js` or `pnpm start`.

The automatic updater performs the same steps safely and is strongly preferred.

## Command-Line Flags

```bash
node update.js --force          # Update even if already on the latest version
node update.js --skip-backup    # Skip automatic backup (not recommended)
node update.js --verbose        # Print every file copied and command output
```

## What Is Protected

The updater never overwrites or deletes the following items:

- `.env` and `.env.*`
- `uploads/`
- `storage/`
- `plugins/custom/`
- `backups/`
- User data in PostgreSQL

Official plugins (`welcome`, `tickets`, `moderation`) are updated when a new release includes them. Custom and third-party plugins are always left untouched.

## Rollback

Rollback is automatic. If download, extraction, dependency installation, database migration, or build fails, the updater restores the previous files from the backup created at the start of the update.

Backups are stored in:

```text
backups/YYYY-MM-DD-HH-mm-ss/
```

To manually roll back:

1. Stop Vortex.
2. Copy the contents of the desired backup over your installation (preserving `.env`, `uploads/`, `storage/`, and custom plugins).
3. Run `pnpm install --frozen-lockfile`.
4. Run `pnpm db:migrate`.
5. Run `pnpm build`.
6. Start Vortex.

## Dashboard Updates

The updater is designed so the dashboard can invoke it later via an API endpoint:

```http
POST /api/v1/system/update
```

The same `runUpdate` engine used by `update.js` powers the dashboard update flow, so behavior, safety rules, and rollback are identical.

## Troubleshooting

### "Vortex is already up to date."

No action is needed. The installed version is greater than or equal to the latest GitHub release.

### "No releases found for h05/Vortex"

The repository has no published releases, or GitHub API rate limits are in effect. You can set a `GITHUB_TOKEN` environment variable to increase rate limits.

### Download or extraction fails

The updater rolls back automatically. Check your network connection and try again. If the issue persists, restore from the latest backup in `backups/`.

### Migration fails

The updater rolls back automatically. Verify that `DATABASE_URL` is correct and that the PostgreSQL server is reachable. Database tables are never dropped or truncated by the updater.

### Build fails

The updater rolls back automatically. Run `pnpm build` manually after rollback to see detailed error output, then fix the underlying issue before updating again.

### Rollback fails

If the automatic rollback cannot complete, restore manually from the backup directory. The updater never deletes backups automatically.
