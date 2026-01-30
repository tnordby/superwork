'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Rocket,
  Database,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  BarChart3,
  Heart,
  Code,
  Workflow,
  Boxes,
  Globe,
  Zap,
  Brain,
  Shield,
  LineChart,
  Bot,
  CheckCircle,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pause,
  Eye,
} from 'lucide-react';
import type { Project } from '@/types/projects';
import type { ServiceTemplate } from '@/types/services';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'my-projects' | 'browse'>(
    tabParam === 'browse' ? 'browse' : 'my-projects'
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [serviceTemplates, setServiceTemplates] = useState<ServiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch user's projects
  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch('/api/projects');
        const data = await response.json();
        if (response.ok) {
          setProjects(data.projects || []);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    }

    if (activeTab === 'my-projects') {
      fetchProjects();
    }
  }, [activeTab]);

  // Fetch service templates when switching to browse tab
  useEffect(() => {
    async function fetchServiceTemplates() {
      if (serviceTemplates.length > 0) {
        console.log('Service templates already loaded:', serviceTemplates);
        return; // Already loaded
      }

      console.log('Fetching service templates...');
      setServicesLoading(true);
      try {
        const response = await fetch('/api/services');
        const data = await response.json();
        console.log('Service templates response:', data);
        if (response.ok) {
          console.log('Setting service templates:', data.templates);
          setServiceTemplates(data.templates || []);
        } else {
          console.error('Error response:', data);
        }
      } catch (error) {
        console.error('Error fetching service templates:', error);
      } finally {
        setServicesLoading(false);
      }
    }

    if (activeTab === 'browse') {
      fetchServiceTemplates();
    }
  }, [activeTab, serviceTemplates.length]);

  const getStatusConfig = (status: string) => {
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
      default:
        return { icon: Pause, color: 'bg-gray-100 text-gray-500', label: status };
    }
  };

  const projectCategories = [
    {
      title: 'HubSpot Services',
      color: 'bg-[#bfe937]',
      projects: [
        {
          name: 'HubSpot onboarding',
          description: 'Fast, structured onboarding tailored to your business',
          icon: Rocket,
          gradient: 'from-green-400 to-green-600'
        },
        {
          name: 'CRM implementation',
          description: 'Custom setup of objects, data model, and user permissions',
          icon: Database,
          gradient: 'from-green-500 to-emerald-600'
        },
        {
          name: 'CRM migration',
          description: 'Clean migration of contacts, deals, companies, custom objects',
          icon: RefreshCw,
          gradient: 'from-lime-400 to-green-500'
        },
        {
          name: 'Data cleansing',
          description: 'Improve data accuracy with workflows and automation',
          icon: Sparkles,
          gradient: 'from-green-400 to-teal-500'
        },
        {
          name: 'Lifecycle management',
          description: 'Define your lead stages, scoring, and handover processes',
          icon: Target,
          gradient: 'from-emerald-400 to-green-600'
        },
      ],
    },
    {
      title: 'Revenue Operations',
      color: 'bg-[#c8e6a0]',
      projects: [
        {
          name: 'Sales process design',
          description: 'Build pipelines, playbooks, and activities that drive revenue',
          icon: TrendingUp,
          gradient: 'from-blue-400 to-indigo-600'
        },
        {
          name: 'Sales enablement',
          description: 'Templates, sequences, and content aligned to your buyers',
          icon: Users,
          gradient: 'from-indigo-400 to-purple-600'
        },
        {
          name: 'Account-Based Marketing',
          description: 'Target and activate high-value accounts inside HubSpot',
          icon: Target,
          gradient: 'from-purple-400 to-pink-600'
        },
        {
          name: 'Reporting & dashboards',
          description: 'Create insight-driven dashboards for leadership & teams',
          icon: BarChart3,
          gradient: 'from-blue-500 to-cyan-600'
        },
        {
          name: 'Customer success',
          description: 'Understand customer health inside HubSpot',
          icon: Heart,
          gradient: 'from-pink-400 to-rose-600'
        },
      ],
    },
    {
      title: 'Technical Services',
      color: 'bg-[#a8d5d8]',
      projects: [
        {
          name: 'Custom API integrations',
          description: 'Connect HubSpot with ERPs, SaaS tools, or internal systems',
          icon: Code,
          gradient: 'from-cyan-400 to-blue-600'
        },
        {
          name: 'Programmable automation',
          description: 'Advanced workflows using custom code actions',
          icon: Workflow,
          gradient: 'from-teal-400 to-cyan-600'
        },
        {
          name: 'Custom objects',
          description: 'Build a CRM that matches your real business model',
          icon: Boxes,
          gradient: 'from-blue-400 to-teal-600'
        },
        {
          name: 'HubSpot CMS development',
          description: 'Themes, modules, landing pages, and customer portals',
          icon: Globe,
          gradient: 'from-sky-400 to-blue-600'
        },
        {
          name: 'CRM extensions',
          description: 'Build sidebar apps, cards, and UI extensions for teams',
          icon: Zap,
          gradient: 'from-cyan-500 to-blue-700'
        },
      ],
    },
    {
      title: 'AI & Data Services',
      color: 'bg-[#e8f4a0]',
      projects: [
        {
          name: 'HubSpot Data Hub setup',
          description: 'Configure data collections, models, and ingestion',
          icon: Database,
          gradient: 'from-yellow-400 to-orange-600'
        },
        {
          name: 'Data enrichment',
          description: 'Automate enrichment using APIs and AI',
          icon: Sparkles,
          gradient: 'from-amber-400 to-orange-600'
        },
        {
          name: 'Predictive scoring',
          description: 'AI-driven scoring based on historical CRM performance',
          icon: LineChart,
          gradient: 'from-orange-400 to-red-600'
        },
        {
          name: 'AI agents',
          description: 'Deploy autonomous agents for research and follow-ups',
          icon: Bot,
          gradient: 'from-yellow-400 to-amber-600'
        },
        {
          name: 'Data quality automation',
          description: 'Automated corrections and data quality monitoring',
          icon: CheckCircle,
          gradient: 'from-lime-400 to-yellow-600'
        },
      ],
    },
  ];

  // Group service templates by category
  const servicesByCategory = serviceTemplates.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, ServiceTemplate[]>);

  const categories = Object.keys(servicesByCategory);

  const filteredCategories = selectedCategory
    ? projectCategories.filter((cat) => cat.title === selectedCategory)
    : projectCategories;

  const handleServiceClick = (categoryTitle: string, serviceName: string, serviceId?: string) => {
    if (serviceId) {
      router.push(`/projects/create?category=${encodeURIComponent(categoryTitle)}&service=${encodeURIComponent(serviceName)}&templateId=${serviceId}`);
    } else {
      router.push(`/projects/create?category=${encodeURIComponent(categoryTitle)}&service=${encodeURIComponent(serviceName)}`);
    }
  };

  // Helper to get icon and gradient for a service (fallback for design)
  const getServiceVisuals = (serviceName: string) => {
    const name = serviceName.toLowerCase();
    if (name.includes('onboarding')) return { icon: Rocket, gradient: 'from-green-400 to-green-600' };
    if (name.includes('crm') || name.includes('implementation')) return { icon: Database, gradient: 'from-green-500 to-emerald-600' };
    if (name.includes('migration')) return { icon: RefreshCw, gradient: 'from-lime-400 to-green-500' };
    if (name.includes('data') || name.includes('cleansing')) return { icon: Sparkles, gradient: 'from-green-400 to-teal-500' };
    if (name.includes('lifecycle') || name.includes('scoring')) return { icon: Target, gradient: 'from-emerald-400 to-green-600' };
    if (name.includes('sales') || name.includes('revenue')) return { icon: TrendingUp, gradient: 'from-blue-400 to-indigo-600' };
    if (name.includes('enablement')) return { icon: Users, gradient: 'from-indigo-400 to-purple-600' };
    if (name.includes('marketing') || name.includes('abm')) return { icon: Target, gradient: 'from-purple-400 to-pink-600' };
    if (name.includes('reporting') || name.includes('dashboard')) return { icon: BarChart3, gradient: 'from-blue-500 to-cyan-600' };
    if (name.includes('customer')) return { icon: Heart, gradient: 'from-pink-400 to-rose-600' };
    if (name.includes('api') || name.includes('integration')) return { icon: Code, gradient: 'from-cyan-400 to-blue-600' };
    if (name.includes('automation') || name.includes('workflow')) return { icon: Workflow, gradient: 'from-teal-400 to-cyan-600' };
    if (name.includes('object')) return { icon: Boxes, gradient: 'from-blue-400 to-teal-600' };
    if (name.includes('cms') || name.includes('website')) return { icon: Globe, gradient: 'from-sky-400 to-blue-600' };
    if (name.includes('extension')) return { icon: Zap, gradient: 'from-cyan-500 to-blue-700' };
    if (name.includes('enrichment')) return { icon: Sparkles, gradient: 'from-amber-400 to-orange-600' };
    if (name.includes('ai') || name.includes('agent')) return { icon: Bot, gradient: 'from-yellow-400 to-amber-600' };
    if (name.includes('quality')) return { icon: CheckCircle, gradient: 'from-lime-400 to-yellow-600' };
    return { icon: Sparkles, gradient: 'from-gray-400 to-gray-600' }; // default
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Projects</h1>
          <p className="text-gray-600">Manage your projects and browse available services</p>
        </div>
        <Link
          href="/projects/create"
          className="flex items-center gap-2 rounded-xl bg-[#bfe937] px-6 py-3 text-sm font-medium text-gray-900 transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-8">
        <button
          onClick={() => setActiveTab('my-projects')}
          className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
            activeTab === 'my-projects'
              ? 'text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          My Projects
          {activeTab === 'my-projects' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('browse')}
          className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
            activeTab === 'browse'
              ? 'text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Browse Services
          {activeTab === 'browse' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
          )}
        </button>
      </div>

      {/* My Projects Tab */}
      {activeTab === 'my-projects' && (
        <div>
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="rounded-2xl border-2 border-dashed border-gray-300 p-12">
                <Rocket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects yet</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Get started by creating your first project
                </p>
                <Link
                  href="/projects/create"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#bfe937] px-6 py-3 text-sm font-medium text-gray-900 transition-opacity hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  Create Project
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => {
                const statusConfig = getStatusConfig(project.status);
                const StatusIcon = statusConfig.icon;

                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-gray-300 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ${statusConfig.color}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {statusConfig.label}
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-gray-700">
                      {project.name}
                    </h3>

                    {project.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span className="font-medium">{project.progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#bfe937] transition-all"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>

                      {project.assignee && (
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">Assigned to:</span> {project.assignee}
                        </div>
                      )}

                      <div className="text-xs text-gray-500">
                        Updated {new Date(project.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Browse Services Tab */}
      {activeTab === 'browse' && (
        <div>
          {servicesLoading ? (
            <div className="text-center py-12 text-gray-500">Loading services...</div>
          ) : serviceTemplates.length > 0 ? (
            // Database-driven services
            <>
              {/* Category Badges */}
              <div className="flex flex-wrap gap-4 mb-12">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
                    selectedCategory === null
                      ? 'bg-gray-900 text-white shadow-lg scale-105'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105'
                  }`}
                >
                  <span>ALL SERVICES</span>
                </button>
                {categories.map((category) => {
                  const categoryColor = projectCategories.find(c => c.title === category)?.color || 'bg-gray-200';
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-gray-900 transition-all ${
                        selectedCategory === category
                          ? `${categoryColor} shadow-lg scale-105 ring-2 ring-gray-900 ring-offset-2`
                          : `${categoryColor} hover:scale-105 opacity-80 hover:opacity-100`
                      }`}
                    >
                      <span>{category.toUpperCase()}</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>

              {/* Categories */}
              <div className="space-y-12">
                {categories
                  .filter(cat => !selectedCategory || cat === selectedCategory)
                  .map((category) => (
                    <section key={category}>
                      <h2 className="text-xl font-semibold text-gray-900 mb-6">{category}</h2>
                      {/* Service Cards Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {servicesByCategory[category].map((service) => {
                          const visuals = getServiceVisuals(service.name);
                          const Icon = visuals.icon;
                          return (
                            <button
                              key={service.id}
                              onClick={() => handleServiceClick(category, service.name, service.id)}
                              className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white text-left transition-all hover:border-gray-300 hover:shadow-lg"
                            >
                              {/* Featured Image */}
                              <div className={`relative h-40 bg-gradient-to-br ${visuals.gradient} flex items-center justify-center overflow-hidden`}>
                                <Icon className="h-16 w-16 text-white opacity-90 transition-transform group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/5"></div>
                              </div>

                              {/* Service info */}
                              <div className="p-6">
                                <h3 className="text-base font-semibold text-gray-900">
                                  {service.name}
                                </h3>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))}
              </div>
            </>
          ) : (
            // Fallback to hardcoded services
            <>
              {/* Category Badges */}
              <div className="flex flex-wrap gap-4 mb-12">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
                    selectedCategory === null
                      ? 'bg-gray-900 text-white shadow-lg scale-105'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105'
                  }`}
                >
                  <span>ALL SERVICES</span>
                </button>
                {projectCategories.map((category) => (
                  <button
                    key={category.title}
                    onClick={() => setSelectedCategory(category.title)}
                    className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-gray-900 transition-all ${
                      selectedCategory === category.title
                        ? `${category.color} shadow-lg scale-105 ring-2 ring-gray-900 ring-offset-2`
                        : `${category.color} hover:scale-105 opacity-80 hover:opacity-100`
                    }`}
                  >
                    <span>{category.title.toUpperCase()}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ))}
              </div>

              {/* Categories */}
              <div className="space-y-12">
                {filteredCategories.map((category) => (
                  <section key={category.title}>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">{category.title}</h2>
                    {/* Service Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {category.projects.map((project) => {
                        const Icon = project.icon;
                        return (
                          <button
                            key={project.name}
                            onClick={() => handleServiceClick(category.title, project.name)}
                            className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white text-left transition-all hover:border-gray-300 hover:shadow-lg"
                          >
                            {/* Featured Image */}
                            <div className={`relative h-40 bg-gradient-to-br ${project.gradient} flex items-center justify-center overflow-hidden`}>
                              <Icon className="h-16 w-16 text-white opacity-90 transition-transform group-hover:scale-110" />
                              <div className="absolute inset-0 bg-black/5"></div>
                            </div>

                            {/* Project info */}
                            <div className="p-6">
                              <h3 className="text-base font-semibold text-gray-900 mb-2">
                                {project.name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {project.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
