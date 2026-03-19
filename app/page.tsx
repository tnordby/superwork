import Link from 'next/link';
import { DollarSign } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatAmount } from '@/lib/stripe/utils';
import OnboardingChecklistCard from '@/components/dashboard/OnboardingChecklistCard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type DashboardProjectRow = {
  id: string;
  name: string;
  status: string;
  progress: number | null;
  cost: number | null;
  updated_at: string;
};

type DashboardData = {
  activeProjects: DashboardProjectRow[];
  recentActivity: Array<{
    id: string;
    title: string;
    timestamp: string;
    initials: string;
    tone: 'blue' | 'green' | 'purple';
  }>;
  onboardingProgress: {
    hubspotAccessCompleted: boolean;
    documentCompleted: boolean;
    surveyCompleted: boolean;
    isHidden: boolean;
  };
  onboardingLinks: {
    hubspotAccessUrl: string;
    documentUrl: string;
    surveyUrl: string;
    videoUrl: string;
  };
  billing: {
    totalBalance: number;
    usedBalance: number;
    inProgressBalance: number;
    availableBalance: number;
    currency: string;
    subscriptionStatus: string | null;
    subscriptionInterval: string | null;
    currentPeriodEnd: string | null;
  };
};

function formatProjectStatus(status: string): string {
  switch (status) {
    case 'in_progress':
      return 'In Progress';
    case 'in_review':
      return 'In Review';
    case 'on_hold':
      return 'On Hold';
    case 'completed':
      return 'Completed';
    case 'planning':
    case 'planned':
      return 'Planning';
    default:
      return status
        .split('_')
        .map((part) => part[0]?.toUpperCase() + part.slice(1))
        .join(' ');
  }
}

function getInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  const initials = `${first}${second}`.toUpperCase();
  return initials || 'SW';
}

function formatRelativeTime(isoTimestamp: string): string {
  const timestamp = new Date(isoTimestamp).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - timestamp);
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function toneClasses(tone: 'blue' | 'green' | 'purple'): string {
  if (tone === 'green') return 'bg-green-100 text-green-600';
  if (tone === 'purple') return 'bg-purple-100 text-purple-600';
  return 'bg-blue-100 text-blue-600';
}

async function loadDashboardData(): Promise<DashboardData> {
  const fallback: DashboardData = {
    activeProjects: [],
    recentActivity: [],
    onboardingProgress: {
      hubspotAccessCompleted: false,
      documentCompleted: false,
      surveyCompleted: false,
      isHidden: false,
    },
    onboardingLinks: {
      hubspotAccessUrl: '#',
      documentUrl: '#',
      surveyUrl: '#',
      videoUrl: '#',
    },
    billing: {
      totalBalance: 0,
      usedBalance: 0,
      inProgressBalance: 0,
      availableBalance: 0,
      currency: 'usd',
      subscriptionStatus: null,
      subscriptionInterval: null,
      currentPeriodEnd: null,
    },
  };

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return fallback;

    const { data: ownedWorkspace } = await supabase
      .from('workspaces')
      .select(
        'id, stripe_subscription_id, stripe_subscription_status, subscription_interval, current_period_end'
      )
      .eq('owner_id', user.id)
      .maybeSingle();

    const { data: onboardingProgressRow, error: onboardingError } = await supabase
      .from('user_onboarding_progress')
      .select('hubspot_access_completed, document_completed, survey_completed, is_hidden')
      .eq('user_id', user.id)
      .maybeSingle();

    if (onboardingError) {
      console.error('[dashboard] Failed to load onboarding progress:', onboardingError);
    }

    const loadProjectsWithScope = async (selectColumns: string) => {
      const query = supabase
        .from('projects')
        .select(selectColumns)
        .order('updated_at', { ascending: false });

      if (ownedWorkspace?.id) {
        return query.or(`user_id.eq.${user.id},workspace_id.eq.${ownedWorkspace.id}`);
      }

      return query.eq('user_id', user.id);
    };

    let { data: projectRows, error: projectsError } = await loadProjectsWithScope(
      'id, name, status, progress, cost, updated_at'
    );

    // Some environments may not have all billing columns yet (e.g., `cost`).
    // Retry with a minimal select so Active Projects still renders correctly.
    if (projectsError) {
      console.error('[dashboard] Failed to load projects with cost column:', projectsError);
      const retry = await loadProjectsWithScope('id, name, status, progress, updated_at');
      projectRows = retry.data;
      projectsError = retry.error;
    }

    if (projectsError) {
      console.error('[dashboard] Failed to load projects:', projectsError);
      return fallback;
    }

    const projects: DashboardProjectRow[] = (projectRows ?? []).map((project: any) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      progress: typeof project.progress === 'number' ? project.progress : 0,
      cost: typeof project.cost === 'number' ? project.cost : 0,
      updated_at: project.updated_at,
    }));

    const usedBalance = projects
      .filter((project) => project.status === 'completed')
      .reduce((sum, project) => sum + (project.cost ?? 0), 0);

    const inProgressBalance = projects
      .filter((project) => project.status === 'in_progress')
      .reduce((sum, project) => sum + (project.cost ?? 0), 0);

    let totalBalance = 0;
    let currency = 'usd';

    if (ownedWorkspace?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
      try {
        const { stripe } = await import('@/lib/stripe/config');
        const subscription = await stripe.subscriptions.retrieve(
          ownedWorkspace.stripe_subscription_id
        );
        const primaryPrice = subscription.items.data[0]?.price;
        totalBalance = primaryPrice?.unit_amount ?? 0;
        currency = primaryPrice?.currency ?? 'usd';
      } catch (stripeError) {
        console.error('[dashboard] Failed to load Stripe subscription amount:', stripeError);
      }
    }

    const activeProjects = projects
      .filter((project) => project.status !== 'completed')
      .slice(0, 5);

    const projectActivity = projects.slice(0, 8).map((project) => ({
      id: `project:${project.id}`,
      title: `${project.name} updated`,
      timestamp: project.updated_at,
      initials: getInitials(project.name),
      tone: 'blue' as const,
    }));

    const messageBaseQuery = supabase
      .from('messages')
      .select(
        `
          id,
          content,
          created_at,
          sender_name,
          conversations(
            project_id,
            projects(name)
          )
        `
      )
      .order('created_at', { ascending: false })
      .limit(8);

    const { data: messageRows, error: messagesError } = await messageBaseQuery;
    if (messagesError) {
      console.error('[dashboard] Failed to load message activity:', messagesError);
    }

    const messageActivity = (messageRows ?? []).map((message: any) => {
      const conversation = Array.isArray(message.conversations)
        ? message.conversations[0]
        : message.conversations;
      const project =
        conversation?.projects && Array.isArray(conversation.projects)
          ? conversation.projects[0]
          : conversation?.projects;
      const projectName = project?.name ?? 'Project';
      const senderName = message.sender_name ?? 'Team';

      return {
        id: `message:${message.id}`,
        title: `${senderName} sent a message in ${projectName}`,
        timestamp: message.created_at,
        initials: getInitials(senderName),
        tone: 'purple' as const,
      };
    });

    const recentActivity = [...projectActivity, ...messageActivity]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6);

    return {
      activeProjects,
      recentActivity,
      onboardingProgress: {
        hubspotAccessCompleted: Boolean(onboardingProgressRow?.hubspot_access_completed),
        documentCompleted: Boolean(onboardingProgressRow?.document_completed),
        surveyCompleted: Boolean(onboardingProgressRow?.survey_completed),
        isHidden: Boolean(onboardingProgressRow?.is_hidden),
      },
      onboardingLinks: {
        hubspotAccessUrl: process.env.ONBOARDING_HUBSPOT_ACCESS_URL ?? '#',
        documentUrl: process.env.ONBOARDING_DOCUMENT_URL ?? '#',
        surveyUrl: process.env.ONBOARDING_SURVEY_URL ?? '#',
        videoUrl: process.env.ONBOARDING_VIDEO_URL ?? '#',
      },
      billing: {
        totalBalance,
        usedBalance,
        inProgressBalance,
        availableBalance: totalBalance - usedBalance - inProgressBalance,
        currency,
        subscriptionStatus: ownedWorkspace?.stripe_subscription_status ?? null,
        subscriptionInterval: ownedWorkspace?.subscription_interval ?? null,
        currentPeriodEnd: ownedWorkspace?.current_period_end ?? null,
      },
    };
  } catch (error) {
    console.error('[dashboard] Failed to load dashboard data:', error);
    return fallback;
  }
}

export default async function Home() {
  const { activeProjects, recentActivity, onboardingProgress, onboardingLinks, billing } = await loadDashboardData();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-semibold text-gray-900 mb-8">Dashboard</h1>

      <div className="mb-6">
        <OnboardingChecklistCard initialProgress={onboardingProgress} links={onboardingLinks} />
      </div>

      {/* Grid Layout - 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Projects Card */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Projects</h2>
          {activeProjects.length === 0 ? (
            <p className="text-sm text-gray-500">No active projects yet.</p>
          ) : (
            <div className="space-y-4">
              {activeProjects.map((project) => (
                <div key={project.id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-500">{formatProjectStatus(project.status)}</p>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{project.progress ?? 0}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-[#bfe937] h-2 rounded-full transition-all"
                      style={{ width: `${project.progress ?? 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link
            href="/projects"
            className="inline-block mt-6 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            View all projects →
          </Link>
        </section>

        {/* Subscription/Usage Card */}
        <section className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0e141d]">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Subscription</h2>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total balance</span>
              <span className="text-lg font-semibold text-gray-900">
                {formatAmount(billing.totalBalance, billing.currency)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Used</span>
              <span className="text-lg font-semibold text-gray-900">
                -{formatAmount(billing.usedBalance, billing.currency)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">In progress</span>
              <span className="text-lg font-semibold text-gray-900">
                -{formatAmount(billing.inProgressBalance, billing.currency)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Available</span>
              <span className="text-lg font-semibold text-gray-900">
                {formatAmount(billing.availableBalance, billing.currency)}
              </span>
            </div>

          </div>

          <Link
            href="/account/usage"
            className="inline-block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            View usage →
          </Link>
        </section>

        {/* Recent Activity Card */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-gray-500">No recent activity yet.</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((event, index) => (
                <div
                  key={event.id}
                  className={`flex items-start gap-3 pb-3 ${
                    index < recentActivity.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${toneClasses(
                      event.tone
                    )}`}
                  >
                    {event.initials}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{event.title}</p>
                    <p className="text-xs text-gray-500">{formatRelativeTime(event.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick Actions Card */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/projects"
              className="block w-full px-4 py-3 text-left text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              View all projects
            </Link>
            <Link
              href="/account/balance"
              className="block w-full px-4 py-3 text-left text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Check account balance
            </Link>
            <Link
              href="/assets"
              className="block w-full px-4 py-3 text-left text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Browse assets
            </Link>
            <Link
              href="/feedback"
              className="block w-full px-4 py-3 text-left text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Submit feedback
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
