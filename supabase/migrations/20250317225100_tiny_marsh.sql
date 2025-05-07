/*
  # Add Program Relations to Strategic Initiatives

  1. Changes
    - Add program_id and subprogram_id columns to strategic_initiatives table
    - Add foreign key constraints
    - Add indexes for better query performance

  2. Security
    - Update RLS policies to handle program and subprogram relations
*/

-- Add new columns to strategic_initiatives
ALTER TABLE strategic_initiatives
ADD COLUMN program_id uuid REFERENCES programs(id) ON DELETE CASCADE,
ADD COLUMN subprogram_id uuid REFERENCES subprograms(id) ON DELETE CASCADE;

-- Add indexes for better query performance
CREATE INDEX idx_strategic_initiatives_program_id ON strategic_initiatives(program_id);
CREATE INDEX idx_strategic_initiatives_subprogram_id ON strategic_initiatives(subprogram_id);

-- Add constraint to ensure initiative is linked to either objective, program, or subprogram
ALTER TABLE strategic_initiatives
ADD CONSTRAINT initiative_relation_check 
CHECK (
  (strategic_objective_id IS NOT NULL AND program_id IS NULL AND subprogram_id IS NULL) OR
  (strategic_objective_id IS NULL AND program_id IS NOT NULL AND subprogram_id IS NULL) OR
  (strategic_objective_id IS NULL AND program_id IS NULL AND subprogram_id IS NOT NULL)
);

-- Update RLS policies
DROP POLICY IF EXISTS "Users can read initiatives" ON strategic_initiatives;
CREATE POLICY "Users can read initiatives"
ON strategic_initiatives
FOR SELECT
TO authenticated
USING (
  -- Allow if user has access to the related objective
  (strategic_objective_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM strategic_objectives so
    WHERE so.id = strategic_initiatives.strategic_objective_id
  ))
  OR
  -- Allow if user has access to the related program
  (program_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM programs p
    WHERE p.id = strategic_initiatives.program_id
  ))
  OR
  -- Allow if user has access to the related subprogram
  (subprogram_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM subprograms sp
    WHERE sp.id = strategic_initiatives.subprogram_id
  ))
);

-- Update write policies for planners
DROP POLICY IF EXISTS "Planners can manage initiatives" ON strategic_initiatives;
CREATE POLICY "Planners can manage initiatives"
ON strategic_initiatives
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_users ou
    WHERE ou.user_id = auth.uid()
    AND ou.role = 'PLANNER'
  )
);