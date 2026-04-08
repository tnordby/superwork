import { DEFAULT_TEAM_CONTACT_NAME } from '@/lib/messaging/constants';

export type CustomerConsultantCheck =
  | { allowed: true }
  | { allowed: false; status: 400 | 403; message: string };

/**
 * Customers may only message the project's named assignee, or the shared team label when none is set.
 */
export function checkCustomerConsultantName(
  consultantName: string,
  projectAssignee: string | null
): CustomerConsultantCheck {
  const assignee = projectAssignee?.trim() || null;

  if (assignee) {
    if (consultantName !== assignee) {
      return {
        allowed: false,
        status: 403,
        message: 'You can only message the contact assigned to this project.',
      };
    }
    return { allowed: true };
  }

  if (consultantName !== DEFAULT_TEAM_CONTACT_NAME) {
    return {
      allowed: false,
      status: 400,
      message:
        'This project does not have a named contact yet. Choose “Your Superwork team” in the inbox to message us.',
    };
  }

  return { allowed: true };
}
