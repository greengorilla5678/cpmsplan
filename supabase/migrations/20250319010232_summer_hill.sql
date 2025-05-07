/*
  # Add default value for baseline field

  1. Changes
    - Add default value for baseline field in performance_measures table
    - Update existing null values to empty string

  2. Security
    - No security changes needed
*/

-- First update any existing null values to empty string
UPDATE performance_measures 
SET baseline = '' 
WHERE baseline IS NULL;

-- Then modify the column to set default value and not null constraint
ALTER TABLE performance_measures 
ALTER COLUMN baseline SET DEFAULT '',
ALTER COLUMN baseline SET NOT NULL;