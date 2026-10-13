# Database rules

- SQLite is the default local provider; `XTRAVEL84_SQLITE_PATH` selects its file.
- Keep only these tables: `object_store`, `object_entities`, `object_links`, and `object_journal`.
- `object_store` contains system user records. The other tables contain Pays catalog, wallet, order, relationship, and ledger data.
- Schema creation must be idempotent and run at application startup.
- Never commit database files, WAL/SHM files, exports, or real customer data.
- Changes to stored shapes require corresponding repository tests and an update to `docs/db-schema.md`.
