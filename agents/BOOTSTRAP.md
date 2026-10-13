# xtravel84 agent bootstrap

## Scope

xtravel84 contains only the Pays and User domains. New work must belong to one of those domains or their shared infrastructure.

## Before changing code

1. Read this file completely.
2. Read the relevant focused rule:
   - [Architecture](rules/architecture.md)
   - [Database](rules/db.md)
   - [UI and design system](rules/ui.md)
3. Preserve the module boundary: domain code stays in `src/api/modules/42pay` or `src/api/modules/system/users`; reusable infrastructure stays under `src/api/shared`.

## Verification

Run, at minimum:

```bash
pnpm test
pnpm build
```

For API or storage changes, also start the API and verify `/health`, login, and one Pays read endpoint. Never commit generated SQLite files or credentials.
