# Pays domain

The Pays domain supports three roles:

- Buyers browse active offers, scan a QR payload, pay with their wallet, review orders, and top up.
- Sellers manage products and offers, see transactions, and receive wallet credits.
- Administrators can inspect all Pays activity and manage users.

The seeded catalog contains sample hotel and supermarket products. Payments are local simulations: creating an order records a buyer debit, seller credit, paid order, wallet balances, and ledger entries atomically at the repository level.

Public API routes are grouped under `/api/42pay`. All domain routes require an authenticated session; repository-level role checks remain the final authorization boundary.
