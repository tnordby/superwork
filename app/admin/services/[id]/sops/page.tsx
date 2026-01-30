'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Service {
  id: string
  name: string
  category: string
}

interface SOP {
  id: string
  service_template_id: string
  title: string
  description: string | null
  order_index: number
  created_at: string
}

export default function AdminSOPsPage() {
  const params = useParams()
  const serviceId = params.id as string
  const supabase = createClient()

  const [service, setService] = useState<Service | null>(null)
  const [sops, setSOPs] = useState<SOP[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSOP, setEditingSOP] = useState<SOP | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  })

  useEffect(() => {
    loadData()
  }, [serviceId])

  async function loadData() {
    setLoading(true)

    // Load service
    const { data: serviceData } = await supabase
      .from('service_templates')
      .select('*')
      .eq('id', serviceId)
      .single()

    setService(serviceData)

    // Load SOPs
    const { data: sopsData } = await supabase
      .from('service_sops')
      .select('*')
      .eq('service_template_id', serviceId)
      .order('order_index', { ascending: true })

    setSOPs(sopsData || [])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (editingSOP) {
      // Update existing SOP
      const response = await fetch(`/api/sops/${editingSOP.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
        }),
      })

      if (response.ok) {
        loadData()
        resetForm()
      } else {
        const error = await response.json()
        alert(`Error updating SOP: ${error.error}`)
      }
    } else {
      // Create new SOP
      const response = await fetch(`/api/services/${serviceId}/sops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          order_index: sops.length,
        }),
      })

      if (response.ok) {
        loadData()
        resetForm()
      } else {
        const error = await response.json()
        alert(`Error creating SOP: ${error.error}`)
      }
    }
  }

  async function handleDelete(sopId: string) {
    const response = await fetch(`/api/sops/${sopId}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      setSOPs(sops.filter((s) => s.id !== sopId))
      setDeleteConfirm(null)
    } else {
      const error = await response.json()
      alert(`Error deleting SOP: ${error.error}`)
    }
  }

  function startEdit(sop: SOP) {
    setEditingSOP(sop)
    setFormData({
      title: sop.title,
      description: sop.description || '',
    })
    setShowForm(true)
  }

  function resetForm() {
    setFormData({ title: '', description: '' })
    setEditingSOP(null)
    setShowForm(false)
  }

  async function moveSOPUp(index: number) {
    if (index === 0) return
    const newSOPs = [...sops]
    ;[newSOPs[index], newSOPs[index - 1]] = [newSOPs[index - 1], newSOPs[index]]
    await updateSOPOrder(newSOPs)
  }

  async function moveSOPDown(index: number) {
    if (index === sops.length - 1) return
    const newSOPs = [...sops]
    ;[newSOPs[index], newSOPs[index + 1]] = [newSOPs[index + 1], newSOPs[index]]
    await updateSOPOrder(newSOPs)
  }

  async function updateSOPOrder(newSOPs: SOP[]) {
    setSOPs(newSOPs)
    // Update order_index for all SOPs
    for (let i = 0; i < newSOPs.length; i++) {
      await fetch(`/api/sops/${newSOPs[i].id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_index: i }),
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading SOPs...</div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Service not found</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/services"
          className="text-blue-600 hover:text-blue-700 text-sm"
        >
          ← Back to services
        </Link>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{service.name}</h2>
        <p className="text-gray-600">Manage SOPs (Standard Operating Procedures)</p>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingSOP ? 'Edit SOP' : 'New SOP'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SOP Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Discovery & Planning"
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
                placeholder="Optional internal description"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingSOP ? 'Save Changes' : 'Create SOP'}
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
          SOPs ({sops.length})
        </h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add SOP
          </button>
        )}
      </div>

      {sops.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600">
            No SOPs yet. Add your first SOP to define how this service is delivered.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sops.map((sop, index) => (
            <div
              key={sop.id}
              className="bg-white p-6 rounded-lg border border-gray-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">
                      #{index + 1}
                    </span>
                    <h4 className="text-lg font-semibold text-gray-900">
                      {sop.title}
                    </h4>
                  </div>
                  {sop.description && (
                    <p className="mt-2 text-gray-600 text-sm">{sop.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => moveSOPUp(index)}
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
                    onClick={() => moveSOPDown(index)}
                    disabled={index === sops.length - 1}
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
                  <Link
                    href={`/admin/sops/${sop.id}/tasks`}
                    className="px-3 py-1 text-sm text-purple-700 bg-purple-50 rounded hover:bg-purple-100 transition-colors"
                  >
                    Tasks
                  </Link>
                  <button
                    onClick={() => startEdit(sop)}
                    className="px-3 py-1 text-sm text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                  >
                    Edit
                  </button>
                  {deleteConfirm === sop.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(sop.id)}
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
                      onClick={() => setDeleteConfirm(sop.id)}
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
    </div>
  )
}
