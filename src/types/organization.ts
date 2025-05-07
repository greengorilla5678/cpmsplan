import { MainActivity } from './plan';

export interface Organization {
  id: number;
  name: string;
  type: 'MINISTER' | 'STATE_MINISTER' | 'CHIEF_EXECUTIVE' | 'LEAD_EXECUTIVE' | 'EXECUTIVE' | 'TEAM_LEAD' | 'DESK';
  parent?: number;
  parentId?: number;
  vision?: string;
  mission?: string;
  core_values?: string[];
  coreValues?: string[];
  created_at?: string;
  updated_at?: string;
}

type OrganizationUserRole = 'ADMIN' | 'PLANNER' | 'EVALUATOR';

export interface OrganizationUser {
  id: number;
  userId: number;
  organizationId: number;
  role: OrganizationUserRole;
  createdAt: string;
  updatedAt: string;
}

export interface StrategicObjective {
  id: number;
  title: string;
  description: string;
  weight: number;
  organization_id?: number;
  programs: Program[];
  initiatives: StrategicInitiative[];
  total_initiatives_weight?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Program {
  id: number;
  name: string;
  description: string;
  weight: number;
  organization_id?: number;
  subprograms: SubProgram[];
  initiatives: StrategicInitiative[];
  total_weight?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SubProgram {
  id: number;
  name: string;
  description: string;
  weight: number;
  organization_id?: number;
  initiatives: StrategicInitiative[];
  total_weight?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StrategicInitiative {
  id: string;
  name: string;
  weight: number;
  strategic_objective: string | null;
  program: string | null;
  subprogram: string | null;
  organization_id?: number;
  performance_measures?: PerformanceMeasure[];
  main_activities?: MainActivity[];
  total_measures_weight?: number;
  total_activities_weight?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PerformanceMeasure {
  id: string;
  initiative: string;
  name: string;
  weight: number;
  baseline: string;
  q1_target: number;
  q2_target: number;
  q3_target: number;
  q4_target: number;
  annual_target: number;
  created_at: string;
  updated_at: string;
}