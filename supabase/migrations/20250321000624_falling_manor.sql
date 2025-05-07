/*
  # Remove Weight Validation Constraints

  1. Changes
    - Remove weight validation constraints from strategic_initiatives table
    - Update triggers and functions that enforce weight validation

  2. Security
    - No security changes needed
*/

-- Drop existing weight validation constraints if they exist
ALTER TABLE strategic_initiatives
DROP CONSTRAINT IF EXISTS initiative_weight_check;

-- Drop any existing triggers that enforce weight validation
DROP TRIGGER IF EXISTS validate_initiative_weight_trigger ON strategic_initiatives;

-- Create or replace function to only validate basic weight range
CREATE OR REPLACE FUNCTION validate_initiative_weight()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate that weight is positive
  IF NEW.weight <= 0 THEN
    RAISE EXCEPTION 'Initiative weight must be greater than 0';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger that only validates basic weight range
CREATE TRIGGER validate_initiative_weight_trigger
  BEFORE INSERT OR UPDATE ON strategic_initiatives
  FOR EACH ROW
  EXECUTE FUNCTION validate_initiative_weight();

-- Add basic weight range constraint
ALTER TABLE strategic_initiatives
ADD CONSTRAINT initiative_weight_check
CHECK (weight > 0);