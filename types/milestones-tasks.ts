// Milestone types
export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  order_index: number;
  completed: boolean;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MilestoneInsert {
  project_id: string;
  title: string;
  description?: string;
  order_index: number;
  due_date?: string;
}

export interface MilestoneUpdate {
  title?: string;
  description?: string;
  order_index?: number;
  completed?: boolean;
  due_date?: string;
  completed_at?: string;
}

// Task types
export interface Task {
  id: string;
  project_id: string;
  milestone_id: string | null;
  title: string;
  description: string | null;
  order_index: number;
  completed: boolean;
  assignee: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskInsert {
  project_id: string;
  milestone_id?: string;
  title: string;
  description?: string;
  order_index: number;
  assignee?: string;
  due_date?: string;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  milestone_id?: string;
  order_index?: number;
  completed?: boolean;
  assignee?: string;
  due_date?: string;
  completed_at?: string;
}

// Milestone with associated tasks
export interface MilestoneWithTasks extends Milestone {
  tasks: Task[];
}
