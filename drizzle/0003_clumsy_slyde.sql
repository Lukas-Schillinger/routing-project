-- Step 1: Add the column as nullable first
ALTER TABLE "drivers" ADD COLUMN "color" varchar(7);

-- Step 2: Update existing records with random colors
UPDATE drivers 
SET color = (
    ARRAY['#FF5733', '#33FF57', '#3357FF', '#FF33F1', '#F1FF33', 
          '#33FFF1', '#F133FF', '#57FF33', '#5733FF', '#FF3357']
)[1 + (random() * 9)::int]
WHERE color IS NULL;

-- Step 3: Now make the column NOT NULL since all rows have values
ALTER TABLE "drivers" ALTER COLUMN "color" SET NOT NULL;