import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import ProjectsPageClient from './ProjectsPageClient';
import type { ProjectsBrowseServiceRow } from '@/types/services';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function loadBrowseServiceTemplates(): Promise<ProjectsBrowseServiceRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('service_templates')
      .select('id, name, category, customer_description, estimated_hours, is_active')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('[projects] Failed to load service templates:', error);
      return [];
    }

    const normalizeBrowseName = (name: string): string => {
      const normalized = name.trim().toLowerCase();
      if (normalized === 'crm migration' || normalized === 'hubspot crm') {
        return 'HubSpot CRM Migration';
      }
      if (normalized === 'crm implementation') {
        return 'HubSpot CRM Onboarding';
      }
      if (normalized === 'hubspot commerce onboarding') {
        return 'HubSpot Commerce Hub Onboarding';
      }
      return name;
    };

    const hiddenBrowseServices = new Set([
      'hubspot onboarding',
      'hubspot service onboarding',
      'predictive scoring',
      'lifecycle management',
      'hubspot data hub setup',
    ]);

    const rows = (data ?? [])
      .map((row) => ({
        id: row.id,
        name: normalizeBrowseName(row.name),
        originalName: row.name,
        category: row.category,
        customer_description: row.customer_description ?? null,
        estimated_hours: row.estimated_hours,
        is_active: row.is_active,
      }))
      .filter((row) => !hiddenBrowseServices.has(row.name.trim().toLowerCase()));

    // Some migrations seed the same (category, name) templates more than once.
    // Dedupe here to keep the Browse UI clean without risking DB-level deletions
    // that could impact foreign keys (projects.service_template_id, service_sops, etc).
    const deduped: ProjectsBrowseServiceRow[] = [];
    const seen = new Map<string, number>();
    const originalNameByDedupeKey = new Map<string, string>();
    const getTemplatePriority = (originalName: string): number => {
      const normalized = originalName.trim().toLowerCase();
      if (normalized === 'hubspot crm') return 3;
      if (normalized === 'hubspot crm migration') return 2;
      if (normalized === 'crm migration') return 1;
      if (normalized === 'hubspot crm onboarding') return 3;
      if (normalized === 'crm implementation') return 1;
      if (normalized === 'hubspot commerce hub onboarding') return 3;
      if (normalized === 'hubspot commerce onboarding') return 1;
      return 0;
    };
    for (const row of rows) {
      const key = `${row.category}::${row.name}`;
      const existingIndex = seen.get(key);
      if (existingIndex === undefined) {
        seen.set(key, deduped.length);
        originalNameByDedupeKey.set(key, row.originalName);
        deduped.push({
          id: row.id,
          name: row.name,
          category: row.category,
          customer_description: row.customer_description,
          estimated_hours: row.estimated_hours,
          is_active: row.is_active,
        });
        continue;
      }

      const existingOriginal = originalNameByDedupeKey.get(key) ?? '';
      const existingPriority = getTemplatePriority(existingOriginal);
      const nextPriority = getTemplatePriority(row.originalName);
      if (nextPriority > existingPriority) {
        originalNameByDedupeKey.set(key, row.originalName);
        deduped[existingIndex] = {
          id: row.id,
          name: row.name,
          category: row.category,
          customer_description: row.customer_description,
          estimated_hours: row.estimated_hours,
          is_active: row.is_active,
        };
      }
    }

    return deduped;
  } catch (e) {
    console.error('[projects] Unexpected error loading service templates:', e);
    return [];
  }
}

export default async function ProjectsPage() {
  const initialServiceTemplates = await loadBrowseServiceTemplates();

  return (
    <Suspense
      fallback={
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/4 rounded bg-gray-200" />
            <div className="h-4 w-1/2 rounded bg-gray-200" />
          </div>
        </div>
      }
    >
      <ProjectsPageClient initialServiceTemplates={initialServiceTemplates} />
    </Suspense>
  );
}
