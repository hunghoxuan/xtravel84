# xtravel84

xtravel84 is a focused Pays and user-management application.

## What is included

- Pays dashboard, products, offers, QR checkout, orders, wallet top-up, and payment user views.
- User authentication, profiles, password changes, and administrator-managed users.
- A React/Vite admin UI and a small Node.js HTTP API.
- A local SQLite database created at `data/xtravel84.sqlite`.

## Requirements

- Node.js 22 or newer (the data layer uses `node:sqlite`).
- pnpm 9 or newer.

## Setup

```bash
pnpm install
pnpm test
pnpm build
pnpm dev
```

The UI runs at [http://127.0.0.1:3000](http://127.0.0.1:3000) and the API health endpoint is [http://127.0.0.1:3001/health](http://127.0.0.1:3001/health).

Local demo accounts are `user`, `seller`, and `admin`; each initially uses password `123456`. Override it with `XTRAVEL84_DEMO_PASSWORD` before first startup.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | API port |
| `HOST` | `127.0.0.1` | API bind address |
| `XTRAVEL84_SQLITE_PATH` | `data/xtravel84.sqlite` | SQLite database path |
| `XTRAVEL84_DEMO_PASSWORD` | `123456` | Initial demo-user password |
| `VITE_API_PROXY_TARGET` | `http://127.0.0.1:3001` | Vite development proxy |

## Documentation

- [Architecture](docs/architecture.md)
- [Database schema](docs/db-schema.md)
- [Design system](docs/design-system.md)
- [Pays domain](docs/pays.md)

Generated data, SQLite files, and build output are intentionally ignored by Git.
