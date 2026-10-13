# Database schema

xtravel84 creates one SQLite database, `data/xtravel84.sqlite`, with four table families.

| Table | Purpose | Main identity |
| --- | --- | --- |
| `object_store` | System users and authentication data | `(user_id, type, name)` |
| `object_entities` | Products, offers, orders, top-ups, Pays users, and wallets | `(tenant_id, entity_type, entity_key, lang)` |
| `object_links` | Relationships such as user ownership of a primary wallet | `(tenant_id, from_entity_id, to_entity_id, link_type)` |
| `object_journal` | Immutable wallet credits and debits | `id` |

All Pays records use tenant `__42pay__`. System users use object-store scope `__system__` and type `system_users`.

Database files and SQLite `-wal`/`-shm` companions are runtime data and must not be committed.
