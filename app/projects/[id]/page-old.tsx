'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Calendar,
  User,
  MoreVertical,
  CheckCircle,
  Circle,
} from 'lucide-react';
import type { Project, ProjectStatus } from '@/types/projects';

const KANBAN_COLUMNS: { id: ProjectStatus; label: string; color: string }[] = [
  { id: 'planned', label: 'Planned', color: 'bg-blue-100 border-blue-200' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-green-100 border-green-200' },
  { id: 'blocked', label: 'Blocked', color: 'bg-red-100 border-red-200' },
  { id: 'review', label: 'In Review', color: 'bg-purple-100 border-purple-200' },
  { id: 'completed', label: 'Completed', color: 'bg-gray-100 border-gray-200' },
];

// Mock milestones data (would come from database in production)
const MOCK_MILESTONES = [
  { id: 1, title: 'Project kickoff & discovery', completed: true, dueDate: '2024-01-15' },
  { id: 2, title: 'Initial setup & configuration', completed: true, dueDate: '2024-01-22' },
  { id: 3, title: 'Development & implementation', completed: false, dueDate: '2024-02-05' },
  { id: 4, title: 'Testing & QA', completed: false, dueDate: '2024-02-12' },
  { id: 5, title: 'Launch & handover', completed: false, dueDate: '2024-02-19' },
];

// Mock tasks data (would come from database in production)
const MOCK_TASKS = [
  { id: 1, title: 'Review project requirements', completed: true, milestone: 'Project kickoff & discovery' },
  { id: 2, title: 'Define success criteria', completed: true, milestone: 'Project kickoff & discovery' },
  { id: 3, title: 'Set up development environment', completed: true, milestone: 'Initial setup & configuration' },
  { id: 4, title: 'Configure integrations', completed: true, milestone: 'Initial setup & configuration' },
  { id: 5, title: 'Build core functionality', completed: false, milestone: 'Development & implementation' },
  { id: 6, title: 'Implement custom workflows', completed: false, milestone: 'Development & implementation' },
  { id: 7, title: 'Create documentation', completed: false, milestone: 'Development & implementation' },
  { id: 8, title: 'Run quality assurance tests', completed: false, milestone: 'Testing & QA' },
  { id: 9, title: 'User acceptance testing', completed: false, milestone: 'Testing & QA' },
  { id: 10, title: 'Deploy to production', completed: false, milestone: 'Launch & handover' },
  { id: 11, title: 'Team training session', completed: false, milestone: 'Launch & handover' },
  { id: 12, title: 'Post-launch monitoring', completed: false, milestone: 'Launch & handover' },
];

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchProject() {
      try {
        const response = await fetch(`/api/projects/${params.id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch project');
        }

        setProject(data.project);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchProject();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12 text-gray-500">Loading project...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error loading project</h3>
          <p className="text-sm text-gray-600 mb-6">{error || 'Project not found'}</p>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: ProjectStatus) => {
    switch (status) {
      case 'planned':
        return Clock;
      case 'in_progress':
        return Clock;
      case 'blocked':
        return AlertCircle;
      case 'review':
        return Eye;
      case 'completed':
        return CheckCircle2;
    }
  };

  const StatusIcon = getStatusIcon(project.status);
  const completedTasks = MOCK_TASKS.filter(t => t.completed).length;
  const totalTasks = MOCK_TASKS.length;
  const completedMilestones = MOCK_MILESTONES.filter(m => m.completed).length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-semibold text-gray-900">{project.name}</h1>
              <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700">
                <StatusIcon className="h-3.5 w-3.5" />
                {KANBAN_COLUMNS.find(col => col.id === project.status)?.label}
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="font-medium">Category:</span>
                <span>{project.category}</span>
              </div>
              {project.assignee && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{project.assignee}</span>
                </div>
              )}
              {project.due_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Due {new Date(project.due_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          <button className="flex items-center justify-center h-10 w-10 rounded-lg text-gray-600 hover:bg-gray-100">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span className="font-medium">Overall Progress</span>
          <span>{project.progress}% Complete</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#bfe937] transition-all duration-300"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      {/* Kanban Board */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Project Status</h2>
        <div className="grid grid-cols-5 gap-4">
          {KANBAN_COLUMNS.map((column) => {
            const isActive = column.id === project.status;

            return (
              <div
                key={column.id}
                className={`rounded-xl border-2 p-4 transition-all ${
                  isActive
                    ? `${column.color} ring-2 ring-gray-900 ring-offset-2`
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="text-center">
                  <h3 className={`text-sm font-semibold mb-2 ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                    {column.label}
                  </h3>
                  {isActive && (
                    <div className="mt-3 p-3 bg-white rounded-lg shadow-sm">
                      <p className="text-xs text-gray-600 mb-2">Current Stage</p>
                      <div className="flex items-center justify-center">
                        <div className="h-3 w-3 rounded-full bg-[#bfe937] animate-pulse" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{project.description}</p>
          </div>
        </div>
      )}

      {/* Milestones */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Milestones</h2>
          <span className="text-sm text-gray-600">
            {completedMilestones} of {MOCK_MILESTONES.length} completed
          </span>
        </div>

        <div className="space-y-3">
          {MOCK_MILESTONES.map((milestone) => (
            <div
              key={milestone.id}
              className={`rounded-xl border p-4 transition-all ${
                milestone.completed
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {milestone.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <h3 className={`text-sm font-medium ${milestone.completed ? 'text-gray-700 line-through' : 'text-gray-900'}`}>
                      {milestone.title}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">
                      Due: {new Date(milestone.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tasks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Tasks</h2>
          <span className="text-sm text-gray-600">
            {completedTasks} of {totalTasks} completed
          </span>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-200">
          {MOCK_TASKS.map((task) => (
            <div
              key={task.id}
              className={`p-4 transition-all ${
                task.completed ? 'bg-gray-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {task.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${task.completed ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{task.milestone}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
