-- Create main_activities table with simplified structure
CREATE TABLE IF NOT EXISTS main_activities (
  id VARCHAR(36) PRIMARY KEY,
  initiative_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  weight DECIMAL(5,2) NOT NULL CHECK (weight >= 0 AND weight <= 100),
  selected_months JSON,
  selected_quarters JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (initiative_id) REFERENCES strategic_initiatives(id) ON DELETE CASCADE
);

-- Create activity_budgets table
CREATE TABLE IF NOT EXISTS activity_budgets (
  id VARCHAR(36) PRIMARY KEY,
  activity_id VARCHAR(36) NOT NULL,
  budget_calculation_type ENUM('WITH_TOOL', 'WITHOUT_TOOL') NOT NULL,
  activity_type ENUM('Training', 'Meeting', 'Workshop', 'Printing', 'Supervision', 'Procurement', 'Other'),
  estimated_cost_with_tool DECIMAL(12,2) DEFAULT 0,
  estimated_cost_without_tool DECIMAL(12,2) DEFAULT 0,
  government_treasury DECIMAL(12,2) DEFAULT 0,
  sdg_funding DECIMAL(12,2) DEFAULT 0,
  partners_funding DECIMAL(12,2) DEFAULT 0,
  other_funding DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES main_activities(id) ON DELETE CASCADE,
  UNIQUE KEY unique_activity_budget (activity_id)
);

-- Create activity_costs table for training details
CREATE TABLE IF NOT EXISTS activity_costs (
  id VARCHAR(36) PRIMARY KEY,
  budget_id VARCHAR(36) NOT NULL,
  description TEXT,
  number_of_days INT NOT NULL DEFAULT 1,
  number_of_participants INT NOT NULL DEFAULT 1,
  training_location VARCHAR(50),
  additional_participant_costs JSON,
  additional_session_costs JSON,
  transport_required BOOLEAN DEFAULT FALSE,
  land_transport_participants INT DEFAULT 0,
  air_transport_participants INT DEFAULT 0,
  other_costs DECIMAL(12,2) DEFAULT 0,
  justification TEXT,
  total_budget DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (budget_id) REFERENCES activity_budgets(id) ON DELETE CASCADE,
  UNIQUE KEY unique_budget_cost (budget_id)
);