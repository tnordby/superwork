'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, CheckCircle2, AlertCircle, RefreshCw, Eye, Loader2 } from 'lucide-react';
import type { Project, ProjectStatus } from '@/types/projects';

export default function ActiveProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [viewingClientName, setViewingClientName] = useState<string | null>(null);

  useEffect(() => {
    async function loadContext() {
      try {
        const response = await fetch('/api/internal/selected-workspace', { credentials: 'include' });
        if (!response.ok) return;
        const data = await response.json();
        if (typeof data.workspace_name === 'string' && data.workspace_name) {
          setViewingClientName(data.workspace_name);
        }
      } catch {
        // no-op
      }
    }
    void loadContext();
  }, []);

  useEffect(() => {
    async function fetchProjects() {
      setError('');
      setLoading(true);
      try {
        const response = await fetch('/api/projects', { credentials: 'include' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch projects');
        }

        setProjects(data.projects || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    }

    void fetchProjects();
  }, [reloadToken]);

  const getStatusConfig = (status: ProjectStatus) => {
    switch (status) {
      case 'planned':
        return { icon: Clock, color: 'bg-blue-100 text-blue-700', label: 'Planned' };
      case 'in_progress':
        return { icon: RefreshCw, color: 'bg-green-100 text-green-700', label: 'In Progress' };
      case 'blocked':
        return { icon: AlertCircle, color: 'bg-red-100 text-red-700', label: 'Blocked' };
      case 'review':
        return { icon: Eye, color: 'bg-purple-100 text-purple-700', label: 'In Review' };
      case 'completed':
        return { icon: CheckCircle2, color: 'bg-gray-100 text-gray-700', label: 'Completed' };
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          Loading projects...
        </div>
      </div>
    );
  }

  if (error) {
    const needsClientContext = error.includes('Select a client context');
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error loading projects</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          {needsClientContext ? (
            <p className="text-sm text-gray-600 mb-4">
              <Link href="/team" className="font-medium text-gray-900 underline underline-offset-2">
                Open team workspace
              </Link>{' '}
              and select a client, then retry.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setReloadToken((value) => value + 1)}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Retry
          </button>
          <div className="mt-4">
            <Link
              href="/projects"
              className="text-sm text-gray-600 hover:text-gray-900 underline underline-offset-2"
            >
              Back to all projects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">My Projects</h1>
        <p className="text-gray-600">Track and manage your ongoing projects</p>
        {viewingClientName && (
          <div className="mt-3 inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
            Viewing: {viewingClientName}
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="text-3xl font-bold text-gray-900 mb-1">{projects.length}</div>
          <div className="text-sm text-gray-600">Total Projects</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="text-3xl font-bold text-green-600 mb-1">
            {projects.filter((p) => p.status === 'in_progress').length}
          </div>
          <div className="text-sm text-gray-600">In Progress</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="text-3xl font-bold text-purple-600 mb-1">
            {projects.filter((p) => p.status === 'review').length}
          </div>
          <div className="text-sm text-gray-600">In Review</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="text-3xl font-bold text-blue-600 mb-1">
            {projects.filter((p) => p.status === 'planned').length}
          </div>
          <div className="text-sm text-gray-600">Planned</div>
        </div>
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-600 mb-4">Start a new project to see it here</p>
          <Link
            href="/projects"
            className="inline-flex items-center justify-center rounded-lg bg-[#bfe937] px-4 py-2 text-sm font-medium text-gray-900 hover:bg-[#a8d230] transition-colors"
          >
            Browse Services
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const statusConfig = getStatusConfig(project.status);
            const StatusIcon = statusConfig.icon;

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-gray-300 hover:shadow-lg cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                      <span
                        className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${statusConfig.color}`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{project.category}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{project.progress}%</div>
                    <div className="text-xs text-gray-500">Complete</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-[#bfe937] h-2 rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                {/* Project Details */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    {project.assignee && (
                      <div>
                        <span className="text-gray-500">Assignee: </span>
                        <span className="text-gray-900 font-medium">{project.assignee}</span>
                      </div>
                    )}
                  </div>
                  {project.due_date && (
                    <div>
                      <span className="text-gray-500">Due: </span>
                      <span className="text-gray-900 font-medium">
                        {new Date(project.due_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
