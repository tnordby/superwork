export type ConversationId = string;

export interface ConversationSummary {
  id: ConversationId;
  project_id: string;
  project_name: string | null;
  consultant_name: string;
  participant_names: string[];
  consultant_initials: string;
  last_message: string | null;
  last_message_at: string | null;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: ConversationId;
  sender_id: string | null;
  sender_name: string;
  content: string;
  is_from_user: boolean;
  read: boolean;
  created_at: string;
}

export interface ConversationOption {
  projectId: string;
  projectName: string;
  contacts: Array<{
    name: string;
    initials: string;
  }>;
}

