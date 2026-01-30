'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface SOP {
  id: string
  title: string
  service_template_id: string
}

interface Service {
  id: string
  name: string
}

interface Task {
  id: string
  sop_id: string
  title: string
  description: string | null
  order_index: number
  is_required: boolean
  estimated_hours: number | null
  created_at: string
}

export default function AdminTasksPage() {
  const params = useParams()
  const router = useRouter()
  const sopId = params.id as string
  const supabase = createClient()

  const [sop, setSOP] = useState<SOP | null>(null)
  const [service, setService] = useState<Service | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_required: true,
    estimated_hours: '',
  })

  useEffect(() => {
    loadData()
  }, [sopId])

  async function loadData() {
    setLoading(true)

    // Load SOP
    const { data: sopData } = await supabase
      .from('service_sops')
      .select('*')
      .eq('id', sopId)
      .single()

    if (!sopData) {
      alert('SOP not found')
      router.push('/admin/services')
      return
    }

    setSOP(sopData)

    // Load service
    const { data: serviceData } = await supabase
      .from('service_templates')
      .select('*')
      .eq('id', sopData.service_template_id)
      .single()

    setService(serviceData)

    // Load tasks
    const response = await fetch(`/api/sops/${sopId}/tasks`)
    if (response.ok) {
      const data = await response.json()
      setTasks(data.tasks || [])
    }

    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (editingTask) {
      // Update existing task
      const response = await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          is_required: formData.is_required,
          estimated_hours: formData.estimated_hours
            ? parseFloat(formData.estimated_hours)
            : null,
        }),
      })

      if (response.ok) {
        loadData()
        resetForm()
      } else {
        const error = await response.json()
        alert(`Error updating task: ${error.error}`)
      }
    } else {
      // Create new task
      const response = await fetch(`/api/sops/${sopId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          is_required: formData.is_required,
          estimated_hours: formData.estimated_hours
            ? parseFloat(formData.estimated_hours)
            : null,
          order_index: tasks.length,
        }),
      })

      if (response.ok) {
        loadData()
        resetForm()
      } else {
        const error = await response.json()
        alert(`Error creating task: ${error.error}`)
      }
    }
  }

  async function handleDelete(taskId: string) {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      setTasks(tasks.filter((t) => t.id !== taskId))
      setDeleteConfirm(null)
    } else {
      const error = await response.json()
      alert(`Error deleting task: ${error.error}`)
    }
  }

  function startEdit(task: Task) {
    setEditingTask(task)
    setFormData({
      title: task.title,
      description: task.description || '',
      is_required: task.is_required,
      estimated_hours: task.estimated_hours?.toString() || '',
    })
    setShowForm(true)
  }

  function resetForm() {
    setFormData({
      title: '',
      description: '',
      is_required: true,
      estimated_hours: '',
    })
    setEditingTask(null)
    setShowForm(false)
  }

  async function moveTaskUp(index: number) {
    if (index === 0) return
    const newTasks = [...tasks]
    ;[newTasks[index], newTasks[index - 1]] = [newTasks[index - 1], newTasks[index]]
    await updateTaskOrder(newTasks)
  }

  async function moveTaskDown(index: number) {
    if (index === tasks.length - 1) return
    const newTasks = [...tasks]
    ;[newTasks[index], newTasks[index + 1]] = [newTasks[index + 1], newTasks[index]]
    await updateTaskOrder(newTasks)
  }

  async function updateTaskOrder(newTasks: Task[]) {
    setTasks(newTasks)
    // Update order_index for all tasks
    for (let i = 0; i < newTasks.length; i++) {
      await fetch(`/api/tasks/${newTasks[i].id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_index: i }),
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading tasks...</div>
      </div>
    )
  }

  if (!sop || !service) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">SOP not found</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/admin/services/${service.id}/sops`}
          className="text-blue-600 hover:text-blue-700 text-sm"
        >
          ← Back to SOPs
        </Link>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{service.name}</h2>
        <p className="text-gray-600">SOP: {sop.title}</p>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingTask ? 'Edit Task' : 'New Task'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Conduct discovery call with stakeholders"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional task description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.estimated_hours}
                  onChange={(e) =>
                    setFormData({ ...formData, estimated_hours: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 2"
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_required}
                    onChange={(e) =>
                      setFormData({ ...formData, is_required: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Required task
                  </span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingTask ? 'Save Changes' : 'Create Task'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Tasks ({tasks.length})
        </h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Task
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600">
            No tasks yet. Add your first task to define this SOP's checklist.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              className="bg-white p-6 rounded-lg border border-gray-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">
                      #{index + 1}
                    </span>
                    <h4 className="text-lg font-semibold text-gray-900">
                      {task.title}
                    </h4>
                    {task.is_required && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="mt-2 text-gray-600 text-sm">{task.description}</p>
                  )}
                  {task.estimated_hours && (
                    <p className="mt-2 text-sm text-gray-500">
                      Estimated: {task.estimated_hours} hours
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => moveTaskUp(index)}
                    disabled={index === 0}
                    className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveTaskDown(index)}
                    disabled={index === tasks.length - 1}
                    className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => startEdit(task)}
                    className="px-3 py-1 text-sm text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                  >
                    Edit
                  </button>
                  {deleteConfirm === task.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(task.id)}
                      className="px-3 py-1 text-sm text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">
          Total estimated hours for this SOP
        </h4>
        <p className="text-2xl font-bold text-blue-700">
          {tasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0)} hours
        </p>
      </div>
    </div>
  )
}
