/*
  # Update Performance Measure Baseline Field

  1. Changes
    - Add default value for baseline field in performance_measures table
    - Update existing null values to empty string
    - Make baseline field not nullable

  2. Security
    - No security changes needed
*/

-- First update any existing null values to empty string
UPDATE performance_measures 
SET baseline = COALESCE(baseline, '');

-- Then modify the column to set default value and not null constraint
ALTER TABLE performance_measures 
ALTER COLUMN baseline SET DEFAULT '',
ALTER COLUMN baseline SET NOT NULL;

-- Add check constraint to ensure baseline is never null
ALTER TABLE performance_measures
ADD CONSTRAINT baseline_not_null CHECK (baseline IS NOT NULL);