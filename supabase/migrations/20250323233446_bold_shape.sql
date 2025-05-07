/*
  # Fix Activity Budget Model

  1. Changes
    - Add funding_gap and total_funding computed columns
    - Add validation triggers for budget calculations
    - Update existing records to ensure data consistency

  2. Security
    - No security changes needed
*/

-- Add computed columns for budget calculations
ALTER TABLE activity_budgets
ADD COLUMN IF NOT EXISTS total_funding DECIMAL(12,2) GENERATED ALWAYS AS (
  government_treasury + sdg_funding + partners_funding + other_funding
) STORED;

ALTER TABLE activity_budgets
ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(12,2) GENERATED ALWAYS AS (
  CASE 
    WHEN budget_calculation_type = 'WITH_TOOL' THEN estimated_cost_with_tool
    ELSE estimated_cost_without_tool
  END
) STORED;

ALTER TABLE activity_budgets
ADD COLUMN IF NOT EXISTS funding_gap DECIMAL(12,2) GENERATED ALWAYS AS (
  CASE 
    WHEN budget_calculation_type = 'WITH_TOOL' THEN 
      estimated_cost_with_tool - (government_treasury + sdg_funding + partners_funding + other_funding)
    ELSE 
      estimated_cost_without_tool - (government_treasury + sdg_funding + partners_funding + other_funding)
  END
) STORED;

-- Add validation trigger function
CREATE OR REPLACE FUNCTION validate_activity_budget()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total funding
  NEW.total_funding := NEW.government_treasury + NEW.sdg_funding + NEW.partners_funding + NEW.other_funding;
  
  -- Calculate estimated cost
  IF NEW.budget_calculation_type = 'WITH_TOOL' THEN
    NEW.estimated_cost := NEW.estimated_cost_with_tool;
  ELSE
    NEW.estimated_cost := NEW.estimated_cost_without_tool;
  END IF;
  
  -- Validate total funding against estimated cost
  IF NEW.total_funding > NEW.estimated_cost THEN
    RAISE EXCEPTION 'Total funding cannot exceed estimated cost';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS validate_activity_budget_trigger ON activity_budgets;
CREATE TRIGGER validate_activity_budget_trigger
  BEFORE INSERT OR UPDATE ON activity_budgets
  FOR EACH ROW
  EXECUTE FUNCTION validate_activity_budget();

-- Update existing records to ensure consistency
UPDATE activity_budgets
SET 
  estimated_cost_with_tool = CASE 
    WHEN budget_calculation_type = 'WITH_TOOL' THEN estimated_cost_with_tool
    ELSE 0
  END,
  estimated_cost_without_tool = CASE 
    WHEN budget_calculation_type = 'WITHOUT_TOOL' THEN estimated_cost_without_tool
    ELSE 0
  END;