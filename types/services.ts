// =============================================
// SERVICE TEMPLATES & SOPs TYPES
// =============================================

// Service Template (Predefined Service)
export interface ServiceTemplate {
  id: string;
  name: string;
  category: string;
  customer_description: string;
  estimated_hours: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Active service rows for /projects Browse tab (server-fetched; matches lean `service_templates` select). */
export interface ProjectsBrowseServiceRow {
  id: string;
  name: string;
  category: string;
  customer_description: string | null;
  estimated_hours: number | null;
  is_active: boolean;
}

// Service SOP (Internal Only)
export interface ServiceSOP {
  id: string;
  service_template_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// SOP Task (Template Level)
export interface SOPTask {
  id: string;
  sop_id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_required: boolean;
  estimated_hours: number | null;
  created_at: string;
  updated_at: string;
}

// Service Template with SOPs and Tasks (extended)
export interface ServiceTemplateWithDetails extends ServiceTemplate {
  sops: (ServiceSOP & { tasks: SOPTask[] })[];
}

// Project Phase Change Log
export interface ProjectPhaseChange {
  id: string;
  project_id: string;
  changed_by_user_id: string;
  from_status: string;
  to_status: string;
  note: string | null;
  created_at: string;
}

// Task Status Change Log
export interface TaskStatusChange {
  id: string;
  task_id: string;
  changed_by_user_id: string;
  from_status: string;
  to_status: string;
  created_at: string;
}

// =============================================
// CREATE/UPDATE INPUT TYPES
// =============================================

export interface ServiceTemplateCreate {
  name: string;
  category: string;
  customer_description: string;
  estimated_hours?: number;
  is_active?: boolean;
}

export interface ServiceTemplateUpdate {
  name?: string;
  category?: string;
  customer_description?: string;
  estimated_hours?: number;
  is_active?: boolean;
}

export interface ServiceSOPCreate {
  service_template_id: string;
  title: string;
  description?: string;
  order_index?: number;
}

export interface ServiceSOPUpdate {
  title?: string;
  description?: string;
  order_index?: number;
}

export interface SOPTaskCreate {
  sop_id: string;
  title: string;
  description?: string;
  order_index?: number;
  is_required?: boolean;
  estimated_hours?: number;
}

export interface SOPTaskUpdate {
  title?: string;
  description?: string;
  order_index?: number;
  is_required?: boolean;
  estimated_hours?: number;
}

// =============================================
// API RESPONSE TYPES
// =============================================

export interface ServiceTemplatesResponse {
  templates: ServiceTemplate[];
}

export interface ServiceTemplateResponse {
  template: ServiceTemplateWithDetails;
}

export interface ServiceSOPsResponse {
  sops: ServiceSOP[];
}

export interface SOPTasksResponse {
  tasks: SOPTask[];
}
