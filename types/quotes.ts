// Quote status types
export type QuoteStatus =
  | 'pending_pm_review'
  | 'pending_customer_approval'
  | 'approved'
  | 'rejected';

// Assignment role types
export type AssignmentRole = 'lead' | 'contributor';

// Quote interface
export interface Quote {
  id: string;
  user_id: string;
  project_id: string | null;

  // Quote details
  title: string;
  description: string | null;
  category: string;
  service_type: string;

  // Pricing
  estimated_price: number | null;
  final_price: number | null;
  currency: string;

  // Status tracking
  status: QuoteStatus;

  // Assignment
  assigned_lead_user_id: string | null;
  assignment_locked: boolean;

  // PM review
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  pm_notes: string | null;

  // Customer approval
  approved_at: string | null;
  approved_by_user_id: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// Quote creation input
export interface QuoteInsert {
  title: string;
  description?: string;
  category: string;
  service_type: string;
  estimated_price?: number;
  currency?: string;
}

// Quote update input
export interface QuoteUpdate {
  title?: string;
  description?: string;
  category?: string;
  service_type?: string;
  estimated_price?: number;
  final_price?: number;
  status?: QuoteStatus;
  assigned_lead_user_id?: string;
  assignment_locked?: boolean;
  reviewed_by_user_id?: string;
  reviewed_at?: string;
  pm_notes?: string;
  approved_at?: string;
  approved_by_user_id?: string;
  rejected_at?: string;
  rejection_reason?: string;
}

// Project assignment interface
export interface ProjectAssignment {
  id: string;
  project_id: string;
  user_id: string;
  role: AssignmentRole;
  assigned_by_user_id: string;
  internal_notes: string | null;
  assigned_at: string;
  removed_at: string | null;
}

// Assignment creation input
export interface AssignmentInsert {
  project_id: string;
  user_id: string;
  role: AssignmentRole;
  internal_notes?: string;
}

// Assignment update input
export interface AssignmentUpdate {
  role?: AssignmentRole;
  internal_notes?: string;
  removed_at?: string;
}

// Quote line item interface
export interface QuoteLineItem {
  id: string;
  quote_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// Line item creation input
export interface LineItemInsert {
  quote_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  order_index: number;
}

// Line item update input
export interface LineItemUpdate {
  description?: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  order_index?: number;
}

// Quote with line items
export interface QuoteWithLineItems extends Quote {
  line_items: QuoteLineItem[];
}

// Quote with assignments
export interface QuoteWithAssignments extends Quote {
  assignments: ProjectAssignment[];
}

// User info for assignments
export interface UserInfo {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

// Assignment with user info
export interface AssignmentWithUser extends ProjectAssignment {
  user: UserInfo;
}
