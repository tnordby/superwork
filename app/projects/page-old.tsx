'use client';

import { useState } from 'react';
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
  CheckCircle
} from 'lucide-react';

export default function ProjectsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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

  const filteredCategories = selectedCategory
    ? projectCategories.filter((cat) => cat.title === selectedCategory)
    : projectCategories;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-semibold text-gray-900 mb-2">Projects</h1>
      <p className="text-gray-600 mb-8">Browse available services and start a project</p>

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
    </div>
  );
}
