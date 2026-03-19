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

    const rows = (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      customer_description: row.customer_description ?? null,
      estimated_hours: row.estimated_hours,
      is_active: row.is_active,
    }));

    // Some migrations seed the same (category, name) templates more than once.
    // Dedupe here to keep the Browse UI clean without risking DB-level deletions
    // that could impact foreign keys (projects.service_template_id, service_sops, etc).
    const deduped: ProjectsBrowseServiceRow[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      const key = `${row.category}::${row.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(row);
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
