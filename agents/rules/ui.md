# UI and design-system rules

- Use tokens from `src/admin/app/styles/base.css`; do not hard-code a second palette.
- Reuse existing shared controls before creating a new control.
- Pays pages live under `/admin/42pay`; user/profile pages live under `/system` and `/settings`.
- Keep layouts responsive at 900 px and 620 px breakpoints.
- Interactive controls need visible focus, readable labels, disabled states, and useful error text.
- Preserve role-specific navigation: buyers, sellers, and administrators should only see relevant actions.
