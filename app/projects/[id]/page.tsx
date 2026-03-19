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
  Loader2,
  Mail,
  MessageCircle,
  DollarSign,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Pause,
  Play,
  Trash2,
  X,
} from 'lucide-react';
import type { Project, ProjectStatus } from '@/types/projects';
import type { Milestone, Task } from '@/types/milestones-tasks';

const PHASES: { id: ProjectStatus; label: string }[] = [
  { id: 'planned', label: 'Planning' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'blocked', label: 'Approval' }, // Using 'blocked' as 'approval' until we update the database
  { id: 'completed', label: 'Completed' },
];

// Component to parse and split description into standard description and intake form
function parseDescription(description: string) {
  const intakeFormMarker = '# Intake Form';
  const splitIndex = description.indexOf(intakeFormMarker);

  if (splitIndex === -1) {
    // No intake form section, return all as standard description
    return { standardDescription: description, intakeForm: null };
  }

  const standardDescription = description.substring(0, splitIndex).trim();
  const intakeForm = description.substring(splitIndex + intakeFormMarker.length).trim();

  return { standardDescription, intakeForm };
}

// Component to format markdown sections
function FormattedSection({ content }: { content: string }) {
  const lines = content.split('\n');
  const sections: { heading: string; items: string[] }[] = [];
  let currentSection: { heading: string; items: string[] } | null = null;
  let textBuffer: string[] = [];

  lines.forEach(line => {
    if (line.startsWith('## ')) {
      // Section heading
      if (textBuffer.length > 0) {
        textBuffer = [];
      }
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = { heading: line.replace('## ', '').trim(), items: [] };
    } else if (line.startsWith('- ') && currentSection) {
      // Bullet point item
      currentSection.items.push(line.replace('- ', '').trim());
    } else if (line.trim() && currentSection) {
      // Regular text in a section
      currentSection.items.push(line.trim());
    } else if (line.trim() && !currentSection) {
      // Regular text outside of sections
      textBuffer.push(line.trim());
    }
  });

  // Add last section
  if (currentSection) {
    sections.push(currentSection);
  }

  return (
    <div className="space-y-6">
      {textBuffer.length > 0 && (
        <div className="text-sm text-gray-700 leading-relaxed">
          {textBuffer.join('\n')}
        </div>
      )}
      {sections.map((section, idx) => (
        <div key={idx}>
          <h3 className="text-base font-semibold text-gray-900 mb-3">{section.heading}</h3>
          <div className="space-y-1.5 pl-1">
            {section.items.map((item, itemIdx) => (
              <div key={itemIdx} className="flex items-start gap-3">
                <span className="text-gray-400 mt-0.5 flex-shrink-0">•</span>
                <p className="text-sm text-gray-700 flex-1 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [expandedMilestones, setExpandedMilestones] = useState<Record<string, boolean>>({});
  const [intakeFormExpanded, setIntakeFormExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    async function fetchProjectData() {
      try {
        // Fetch project, milestones, and tasks in parallel
        const [projectRes, milestonesRes, tasksRes] = await Promise.all([
          fetch(`/api/projects/${params.id}`),
          fetch(`/api/projects/${params.id}/milestones`),
          fetch(`/api/projects/${params.id}/tasks`),
        ]);

        const projectData = await projectRes.json();
        const milestonesData = await milestonesRes.json();
        const tasksData = await tasksRes.json();

        if (!projectRes.ok) {
          throw new Error(projectData.error || 'Failed to fetch project');
        }

        setProject(projectData.project);
        setMilestones(milestonesData.milestones || []);
        setTasks(tasksData.tasks || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchProjectData();
    }
  }, [params.id]);

  // Initialize all milestones as collapsed when milestones load
  useEffect(() => {
    if (milestones.length > 0 && Object.keys(expandedMilestones).length === 0) {
      const initialExpanded: Record<string, boolean> = {};
      milestones.forEach(milestone => {
        initialExpanded[milestone.id] = false; // Start collapsed
      });
      initialExpanded['unassigned'] = false;
      setExpandedMilestones(initialExpanded);
    }
  }, [milestones, expandedMilestones]);

  const toggleMilestone = (milestoneId: string) => {
    setExpandedMilestones(prev => ({
      ...prev,
      [milestoneId]: !prev[milestoneId]
    }));
  };

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (!project || updating || project.status === newStatus) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/projects/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      setProject(data.project);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handlePauseProject = async () => {
    if (!project) return;
    setMenuOpen(false);
    await handleStatusChange('blocked');
  };

  const handleResumeProject = async () => {
    if (!project) return;
    setMenuOpen(false);
    await handleStatusChange('in_progress');
  };

  const handleDeleteProject = async () => {
    if (!project) return;

    setUpdating(true);
    setShowDeleteConfirm(false);

    try {
      const response = await fetch(`/api/projects/${params.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete project');
      }

      // Redirect to projects list and refresh
      router.push('/projects');
      router.refresh();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      setUpdating(false);
      setShowDeleteConfirm(true);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          Loading project...
        </div>
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
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const completedMilestones = milestones.filter(m => m.completed).length;

  // Group tasks by milestone
  const tasksByMilestone = tasks.reduce((acc, task) => {
    const key = task.milestone_id || 'unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <div className="p-8">
      {/* Main Layout with Sidebar */}
      <div className="flex gap-8">
        {/* Main Content */}
        <div className="flex-1">
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
                {PHASES.find(phase => phase.id === project.status)?.label}
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-600">
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

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center justify-center h-10 w-10 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              <MoreVertical className="h-5 w-5" />
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />

                {/* Menu */}
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg z-20">
                  <div className="py-1">
                    {project.status === 'blocked' ? (
                      <button
                        onClick={handleResumeProject}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
                      >
                        <Play className="h-4 w-4" />
                        <span>Resume Project</span>
                      </button>
                    ) : (
                      <button
                        onClick={handlePauseProject}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Pause className="h-4 w-4" />
                        <span>Pause Project</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setShowDeleteConfirm(true);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Project</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Phase Progress Bar */}
      <div className="mb-8">
        {/* Chevron Progress Steps */}
        <div className="flex items-center">
          {PHASES.map((phase, index) => {
            const currentPhaseIndex = PHASES.findIndex(p => p.id === project.status);
            const isCompleted = index < currentPhaseIndex;
            const isCurrent = phase.id === project.status;

            return (
              <div
                key={phase.id}
                className="relative flex-1 h-16"
                style={{ marginLeft: index > 0 ? '-12px' : '0' }}
              >
                {/* Chevron Shape */}
                <div
                  className={`relative h-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? 'bg-blue-200'
                      : isCurrent
                      ? phase.id === 'planned' ? 'bg-orange-400' : 'bg-red-500'
                      : 'bg-gray-200'
                  }`}
                  style={{
                    clipPath: index === PHASES.length - 1
                      ? 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%, 20px 50%)'
                      : 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%, 20px 50%)',
                  }}
                >
                  <div className="flex items-center gap-2 px-6">
                    {isCompleted && (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        isCurrent ? 'text-white' : isCompleted ? 'text-gray-700' : 'text-gray-500'
                      }`}
                    >
                      {phase.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Description and Intake Form */}
      {project.description && (() => {
        const { standardDescription, intakeForm } = parseDescription(project.description);
        return (
          <>
            {/* Standard Description */}
            {standardDescription && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{standardDescription}</p>
                </div>
              </div>
            )}

            {/* Intake Form */}
            {intakeForm && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Intake Form</h2>
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <button
                    onClick={() => setIntakeFormExpanded(!intakeFormExpanded)}
                    className="w-full px-6 py-4 flex items-center justify-between transition-colors hover:bg-gray-50 border-b border-gray-200"
                  >
                    <span className="text-sm font-medium text-gray-700">
                      {intakeFormExpanded ? 'Hide details' : 'View details'}
                    </span>
                    {intakeFormExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                  </button>

                  {intakeFormExpanded && (
                    <div className="p-6">
                      <FormattedSection content={intakeForm} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Tasks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Tasks</h2>
          <span className="text-sm text-gray-600">
            {completedTasks} of {totalTasks} completed
          </span>
        </div>

        {tasks.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
            <p className="text-sm text-gray-600">No tasks added yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {milestones.map((milestone) => {
              const milestoneTasks = tasksByMilestone[milestone.id] || [];
              if (milestoneTasks.length === 0) return null;

              const completedInMilestone = milestoneTasks.filter(t => t.completed).length;
              const totalInMilestone = milestoneTasks.length;
              const milestoneCompleted = completedInMilestone === totalInMilestone;
              const isExpanded = expandedMilestones[milestone.id] ?? false;

              return (
                <div key={milestone.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  {/* Milestone Header - Clickable */}
                  <button
                    onClick={() => toggleMilestone(milestone.id)}
                    className={`w-full p-4 text-left transition-colors ${
                      milestoneCompleted ? 'bg-green-50 hover:bg-green-100' : 'bg-gray-50 hover:bg-gray-100'
                    } ${!isExpanded ? '' : 'border-b border-gray-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500 flex-shrink-0" />
                        )}
                        {milestoneCompleted ? (
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        )}
                        <div>
                          <h3 className={`text-sm font-semibold ${milestoneCompleted ? 'text-gray-700' : 'text-gray-900'}`}>
                            {milestone.title}
                          </h3>
                          {milestone.description && (
                            <p className="text-xs text-gray-600 mt-0.5">{milestone.description}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-medium text-gray-600">
                        {completedInMilestone}/{totalInMilestone}
                      </span>
                    </div>
                  </button>

                  {/* Subtasks - Collapsible */}
                  {isExpanded && (
                    <div className="divide-y divide-gray-100">
                    {milestoneTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`p-4 pl-12 transition-all ${
                          task.completed ? 'bg-gray-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {task.completed ? (
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className={`text-sm ${task.completed ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-xs text-gray-500 mt-1">{task.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Unassigned tasks (if any) */}
            {tasksByMilestone['unassigned'] && tasksByMilestone['unassigned'].length > 0 && (() => {
              const isExpanded = expandedMilestones['unassigned'] ?? false;
              const unassignedTasks = tasksByMilestone['unassigned'];
              const completedUnassigned = unassignedTasks.filter(t => t.completed).length;

              return (
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <button
                    onClick={() => toggleMilestone('unassigned')}
                    className={`w-full p-4 text-left transition-colors bg-gray-50 hover:bg-gray-100 ${!isExpanded ? '' : 'border-b border-gray-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500 flex-shrink-0" />
                        )}
                        <h3 className="text-sm font-semibold text-gray-900">Other Tasks</h3>
                      </div>
                      <span className="text-xs font-medium text-gray-600">
                        {completedUnassigned}/{unassignedTasks.length}
                      </span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="divide-y divide-gray-100">
                  {tasksByMilestone['unassigned'].map((task) => (
                    <div
                      key={task.id}
                      className={`p-4 pl-12 transition-all ${
                        task.completed ? 'bg-gray-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {task.completed ? (
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className={`text-sm ${task.completed ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-gray-500 mt-1">{task.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 space-y-6 sticky top-24 self-start">
          {/* Consultant Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Your Consultant</h3>

            {project.assignee ? (
              <div className="space-y-4">
                {/* Profile */}
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-[#bfe937] flex items-center justify-center">
                    <span className="text-lg font-semibold text-gray-900">
                      {project.assignee.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{project.assignee}</p>
                    <p className="text-xs text-gray-600">Lead Consultant</p>
                  </div>
                </div>

                {/* Contact Actions */}
                <div className="space-y-2">
                  <a
                    href={`mailto:consultant@superwork.com?subject=Project: ${project.name}`}
                    className="flex items-center gap-3 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Mail className="h-4 w-4 text-gray-600" />
                    <span>Send Email</span>
                  </a>

                  <Link
                    href={`/inbox?projectId=${encodeURIComponent(project.id)}&consultantName=${encodeURIComponent(project.assignee || '')}`}
                    className="flex items-center gap-3 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4 text-gray-600" />
                    <span>Send Message</span>
                  </Link>

                  <a
                    href="https://calendly.com/superwork-consultant"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full rounded-lg bg-[#bfe937] px-4 py-3 text-sm font-medium text-gray-900 hover:opacity-90 transition-opacity"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Book Meeting</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No consultant assigned yet</p>
              </div>
            )}
          </div>

          {/* Project Details Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Project Details</h3>

            <div className="space-y-4">
              {/* Due Date */}
              {project.due_date && (
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <CalendarClock className="h-4 w-4" />
                    <span className="text-sm">Deadline</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(project.due_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              )}

              {/* Started Date */}
              {project.started_at && (
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Started</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(project.started_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              )}

              {/* Service Type */}
              <div className="flex items-start justify-between">
                <span className="text-sm text-gray-600">Service</span>
                <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">
                  {project.service_type}
                </span>
              </div>

              {/* Category */}
              <div className="flex items-start justify-between">
                <span className="text-sm text-gray-600">Category</span>
                <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">
                  {project.category}
                </span>
              </div>

              {/* Created Date */}
              <div className="flex items-start justify-between">
                <span className="text-sm text-gray-600">Created</span>
                <span className="text-sm font-medium text-gray-900">
                  {new Date(project.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Delete Project</h3>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this project? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={updating}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={updating}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Project'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
