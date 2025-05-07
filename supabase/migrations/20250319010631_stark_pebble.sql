/*
  # Update Performance Measure Baseline Field for MySQL

  1. Changes
    - Update existing null values to empty string
    - Modify baseline column to set default and make not null
    - Add check constraint (MySQL 8.0.16+)

  2. Security
    - No security changes needed
*/

-- First update any existing null values to empty string
UPDATE performance_measures 
SET baseline = '' 
WHERE baseline IS NULL;

-- Modify the column to set default value and make it not null
ALTER TABLE performance_measures 
MODIFY COLUMN baseline VARCHAR(255) NOT NULL DEFAULT '';

-- Add check constraint to ensure baseline is never null (MySQL 8.0.16+)
ALTER TABLE performance_measures
ADD CONSTRAINT baseline_not_null 
CHECK (baseline IS NOT NULL);