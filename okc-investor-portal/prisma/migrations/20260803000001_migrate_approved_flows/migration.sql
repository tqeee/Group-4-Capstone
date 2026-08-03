-- The old APPROVED status meant "ledger already reflects this flow, about to
-- be swept to COMPLETED on next rebuild" — any row still sitting there has
-- already had its money counted in the ledger, so fold it into COMPLETED to
-- match reality under the new workflow (where only COMPLETED flows count).
-- APPROVED itself is retired from schema.prisma but stays defined in the
-- Postgres enum type (dropping an enum value requires recreating the type),
-- unused from here on.
UPDATE "fund_flows" SET status = 'COMPLETED' WHERE status = 'APPROVED';
