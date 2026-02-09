-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('SUBSCRIPTION', 'JOB_POSTING', 'ASSESSMENT', 'ADDON_SERVICE', 'FEATURE_UNLOCK', 'SUPPORT', 'OTHER');

-- Step 1: Add temporary column with the new enum type
ALTER TABLE "Product" ADD COLUMN "category_new" "ProductCategory";

-- Step 2: Migrate existing data - Map common values to enum
-- You may need to adjust these mappings based on your actual data
UPDATE "Product" SET "category_new" = 
  CASE 
    WHEN LOWER(category) LIKE '%subscription%' THEN 'SUBSCRIPTION'::"ProductCategory"
    WHEN LOWER(category) LIKE '%job%' OR LOWER(category) LIKE '%posting%' THEN 'JOB_POSTING'::"ProductCategory"
    WHEN LOWER(category) LIKE '%assessment%' OR LOWER(category) LIKE '%test%' THEN 'ASSESSMENT'::"ProductCategory"
    WHEN LOWER(category) LIKE '%addon%' OR LOWER(category) LIKE '%add-on%' THEN 'ADDON_SERVICE'::"ProductCategory"
    WHEN LOWER(category) LIKE '%feature%' OR LOWER(category) LIKE '%unlock%' THEN 'FEATURE_UNLOCK'::"ProductCategory"
    WHEN LOWER(category) LIKE '%support%' THEN 'SUPPORT'::"ProductCategory"
    ELSE 'OTHER'::"ProductCategory"
  END;

-- Step 3: Drop old column
ALTER TABLE "Product" DROP COLUMN "category";

-- Step 4: Rename new column to original name
ALTER TABLE "Product" RENAME COLUMN "category_new" TO "category";

-- Step 5: Make it required (NOT NULL)
ALTER TABLE "Product" ALTER COLUMN "category" SET NOT NULL;
