# Architecture rules

- Keep the API dependency-free at the transport layer: route parsing and JSON responses belong in `src/api/app/server.js`.
- Pays business rules live in `src/api/modules/42pay`; user identity rules live in `src/api/modules/system/users`.
- The admin application may call the API only through `src/admin/app/api.js`.
- Pages must not bypass the service/repository boundary or read SQLite directly.
- Prefer a small, explicit route and dependency surface over generic runtime frameworks.
- A new feature must belong to Pays or Users. Otherwise, it belongs in another repository.
