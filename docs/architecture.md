# Architecture

```text
React/Vite admin (3000)
        |
        | /auth/* and /api/42pay/*
        v
Node HTTP API (3001)
   |                 |
   v                 v
User module        Pays module
   |                 |
   +------ SQLite ---+
```

The API transport is implemented in `src/api/app/server.js`. It owns cookies, sessions, request parsing, role checks, and route dispatch. Business behavior is delegated to the Pays service/repository and the User repository.

The frontend entry point is `src/admin/app/App.jsx`. It handles session hydration, role-aware navigation, and route protection. Domain pages call only the typed methods in `src/admin/app/api.js`.

Shared infrastructure is deliberately small: cache helpers, object-store providers for users, permission normalization, and the Pays entity store.
