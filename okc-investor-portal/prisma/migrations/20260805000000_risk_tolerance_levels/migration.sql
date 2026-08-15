-- 3.4: rename the risk-tolerance levels to the traffic-light wording used in
-- the UI (red = High, amber = Moderate, green = Low).
--
-- RENAME VALUE rather than a new type + column rewrite: it preserves every
-- existing row, keeps the enum's physical order (which becomes LOW, MODERATE,
-- HIGH), and needs no table lock beyond the catalog update. None of the three
-- new names collide with an existing value of this type.
ALTER TYPE "RiskTolerance" RENAME VALUE 'CONSERVATIVE' TO 'LOW';
ALTER TYPE "RiskTolerance" RENAME VALUE 'BALANCED' TO 'MODERATE';
ALTER TYPE "RiskTolerance" RENAME VALUE 'AGGRESSIVE' TO 'HIGH';
