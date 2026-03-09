-- Backfill NULL unitCost values with the product's current unitValue
UPDATE "StockMovement" sm
SET "unitCost" = p."unitValue"
FROM "Product" p
WHERE sm."productId" = p."id"
  AND sm."unitCost" IS NULL;

-- For any remaining NULLs (orphaned records), set a default of 0
UPDATE "StockMovement"
SET "unitCost" = 0
WHERE "unitCost" IS NULL;

-- Now make the column NOT NULL
ALTER TABLE "StockMovement" ALTER COLUMN "unitCost" SET NOT NULL;
