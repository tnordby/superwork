/**
 * Canonical platform roles (customer portal vs internal delivery vs platform admin).
 * Legacy JWT values like `pm` are normalized to `project_manager`.
 */

export type PlatformRole = 'customer' | 'consultant' | 'project_manager' | 'admin';

const LEGACY_PM = new Set(['pm', 'project_manager']);

export function normalizePlatformRole(raw: string | null | undefined): PlatformRole {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (v === 'admin') return 'admin';
  if (LEGACY_PM.has(v)) return 'project_manager';
  if (v === 'consultant') return 'consultant';
  return 'customer';
}

export function isAdmin(role: PlatformRole): boolean {
  return role === 'admin';
}

/** Quotes, pricing, assignments (project managers + legacy pm + admin). */
export function isQuoteManager(role: PlatformRole): boolean {
  return role === 'admin' || role === 'project_manager';
}

/** Delivery: HubSpot consultant (assigned work, messaging as assignee). */
export function isConsultant(role: PlatformRole): boolean {
  return role === 'consultant';
}

export function isInternalStaff(role: PlatformRole): boolean {
  return role === 'admin' || role === 'project_manager' || role === 'consultant';
}

/** Full messaging / conversation visibility (admin + PM). */
export function hasFullMessagingAccess(role: PlatformRole): boolean {
  return role === 'admin' || role === 'project_manager';
}

/** Services / SOPs editing (admin-only in current product). */
export function isServicesAdmin(role: PlatformRole): boolean {
  return role === 'admin';
}

/** Customer dashboard at `/` — internal users use `/team` or `/admin`. */
export function shouldUseCustomerHome(role: PlatformRole): boolean {
  return role === 'customer';
}

/** Map stored platform role to Supabase `user_metadata.role` string (keep in sync with JWT). */
export function platformRoleToMetadataRole(role: PlatformRole): string {
  return role === 'project_manager' ? 'project_manager' : role;
}
