import { Organization, StrategicObjective, Program, SubProgram } from './organization';

export type PlanType = 'LEAD_EXECUTIVE' | 'TEAM_DESK' | 'INDIVIDUAL';
export type PlanStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface Plan {
  id: string;
  organization: string;
  organizationName?: string;
  planner_name: string;
  type: PlanType;
  executive_name?: string;
  strategic_objective: string;
  program?: string;
  subprogram?: string;
  fiscal_year: string;
  from_date: string;
  to_date: string;
  status: PlanStatus;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
  reviews?: PlanReview[];
  objectives?: StrategicObjective[];
}

export interface PlanReview {
  id: string;
  plan: string;
  evaluator: string;
  evaluator_name: string;
  status: 'APPROVED' | 'REJECTED';
  feedback: string;
  reviewed_at: string;
}

export interface PlanningPeriod {
  fromDate: string;
  toDate: string;
}

export type BudgetCalculationType = 'WITH_TOOL' | 'WITHOUT_TOOL';
export type ActivityType = 'Training' | 'Meeting' | 'Workshop' | 'Printing' | 'Supervision' | 'Procurement' | 'Other';

export interface ActivityBudget {
  id?: string;
  activity_id: string;
  budget_calculation_type: BudgetCalculationType;
  activity_type?: ActivityType;
  estimated_cost_with_tool: number;
  estimated_cost_without_tool: number;
  government_treasury: number;
  sdg_funding: number;
  partners_funding: number;
  other_funding: number;
  training_details?: any;
  meeting_workshop_details?: any;
  procurement_details?: any;
  printing_details?: any;
  supervision_details?: any;
  created_at?: string;
  updated_at?: string;
  total_funding?: number;
  funding_gap?: number;
}

export interface MainActivity {
  id: string;
  initiative: string;
  name: string;
  weight: number;
  selected_months: string[];
  selected_quarters: string[];
  budget?: ActivityBudget;
  created_at?: string;
  updated_at?: string;
}

export type Month = 'JUL' | 'AUG' | 'SEP' | 'OCT' | 'NOV' | 'DEC' | 'JAN' | 'FEB' | 'MAR' | 'APR' | 'MAY' | 'JUN';
export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export const MONTHS: { value: Month; label: string; quarter: Quarter }[] = [
  { value: 'JUL', label: 'July', quarter: 'Q1' },
  { value: 'AUG', label: 'August', quarter: 'Q1' },
  { value: 'SEP', label: 'September', quarter: 'Q1' },
  { value: 'OCT', label: 'October', quarter: 'Q2' },
  { value: 'NOV', label: 'November', quarter: 'Q2' },
  { value: 'DEC', label: 'December', quarter: 'Q2' },
  { value: 'JAN', label: 'January', quarter: 'Q3' },
  { value: 'FEB', label: 'February', quarter: 'Q3' },
  { value: 'MAR', label: 'March', quarter: 'Q3' },
  { value: 'APR', label: 'April', quarter: 'Q4' },
  { value: 'MAY', label: 'May', quarter: 'Q4' },
  { value: 'JUN', label: 'June', quarter: 'Q4' },
];

export const QUARTERS: { value: Quarter; label: string; months: Month[] }[] = [
  { value: 'Q1', label: 'First Quarter (July-September)', months: ['JUL', 'AUG', 'SEP'] },
  { value: 'Q2', label: 'Second Quarter (October-December)', months: ['OCT', 'NOV', 'DEC'] },
  { value: 'Q3', label: 'Third Quarter (January-March)', months: ['JAN', 'FEB', 'MAR'] },
  { value: 'Q4', label: 'Fourth Quarter (April-June)', months: ['APR', 'MAY', 'JUN'] },
];

export const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: 'Training', label: 'Training' },
  { value: 'Meeting', label: 'Meeting' },
  { value: 'Workshop', label: 'Workshop' },
  { value: 'Printing', label: 'Printing' },
  { value: 'Supervision', label: 'Supervision' },
  { value: 'Procurement', label: 'Procurement' },
  { value: 'Other', label: 'Other' }
];