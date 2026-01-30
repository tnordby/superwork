// Project status/stage types
export type ProjectStatus = 'planned' | 'in_progress' | 'blocked' | 'review' | 'completed';

// Project category types
export type ProjectCategory =
  | 'HubSpot Services'
  | 'Revenue Operations'
  | 'Technical Services'
  | 'AI & Data Services';

// Main project type
export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string;
  service_type: string;
  status: ProjectStatus;
  progress: number; // 0-100
  assignee: string | null;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Database insert type (what we send when creating)
export interface ProjectInsert {
  user_id: string;
  name: string;
  description?: string;
  category: string;
  service_type: string;
  status?: ProjectStatus;
  progress?: number;
  assignee?: string;
  due_date?: string;
}

// Database update type
export interface ProjectUpdate {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  progress?: number;
  assignee?: string;
  due_date?: string;
  started_at?: string;
  completed_at?: string;
}

// Project with additional UI state
export interface ProjectWithDetails extends Project {
  task_count?: number;
  completed_task_count?: number;
  last_activity?: string;
}
