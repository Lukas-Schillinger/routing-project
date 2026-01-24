-- Backfill depot_id for existing maps using organization's default depot
UPDATE maps m
SET depot_id = (
    SELECT d.id FROM depots d
    WHERE d.organization_id = m.organization_id
    AND d.default_depot = true
    LIMIT 1
)
WHERE m.depot_id IS NULL;
