/*
  # Activity Costing Assumptions

  1. New Tables
    - `activity_costing_assumptions`
      - `id` (uuid, primary key)
      - `activity_type` (text)
      - `location` (text)
      - `cost_type` (text)
      - `amount` (decimal)
      - `description` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `activity_costing_assumptions` table
    - Add policies for:
      - Admins can manage all assumptions
      - All authenticated users can read assumptions
*/

-- Create activity costing assumptions table
CREATE TABLE IF NOT EXISTS activity_costing_assumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type text NOT NULL,
  location text NOT NULL,
  cost_type text NOT NULL,
  amount decimal NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Add constraints
  CONSTRAINT valid_activity_type CHECK (
    activity_type IN ('Training', 'Meeting', 'Workshop', 'Printing', 'Supervision', 'Procurement', 'Other')
  ),
  CONSTRAINT valid_location CHECK (
    location IN ('Addis_Ababa', 'Adama', 'Bahirdar', 'Mekele', 'Hawassa', 'Gambella', 'Afar', 'Somali')
  ),
  CONSTRAINT valid_cost_type CHECK (
    cost_type IN (
      'per_diem', 'accommodation', 'venue', 'transport_land', 'transport_air',
      'participant_flash_disk', 'participant_stationary',
      'session_flip_chart', 'session_marker', 'session_toner_paper'
    )
  )
);

-- Enable RLS
ALTER TABLE activity_costing_assumptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage assumptions"
  ON activity_costing_assumptions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

CREATE POLICY "All authenticated users can read assumptions"
  ON activity_costing_assumptions
  FOR SELECT
  TO authenticated
  USING (true);