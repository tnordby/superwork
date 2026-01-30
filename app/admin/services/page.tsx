'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Service {
  id: string
  name: string
  category: string
  customer_description: string | null
  estimated_hours: number | null
  is_active: boolean
  created_at: string
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadServices()
  }, [])

  async function loadServices() {
    setLoading(true)
    const { data, error } = await supabase
      .from('service_templates')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error loading services:', error)
    } else {
      setServices(data || [])
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const response = await fetch(`/api/services/${id}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      setServices(services.filter((s) => s.id !== id))
      setDeleteConfirm(null)
    } else {
      const error = await response.json()
      alert(`Error deleting service: ${error.error}`)
    }
  }

  async function toggleActive(id: string, currentStatus: boolean) {
    const response = await fetch(`/api/services/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !currentStatus }),
    })

    if (response.ok) {
      loadServices()
    } else {
      const error = await response.json()
      alert(`Error updating service: ${error.error}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading services...</div>
      </div>
    )
  }

  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = []
    }
    acc[service.category].push(service)
    return acc
  }, {} as Record<string, Service[]>)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Service Templates</h2>
          <p className="text-gray-600">Manage service templates, SOPs, and tasks</p>
        </div>
        <Link
          href="/admin/services/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Service
        </Link>
      </div>

      {Object.keys(groupedServices).length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600">No services yet. Create your first service template.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedServices).map(([category, categoryServices]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{category}</h3>
              <div className="space-y-3">
                {categoryServices.map((service) => (
                  <div
                    key={service.id}
                    className="bg-white p-6 rounded-lg border border-gray-200 hover:border-gray-300 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {service.name}
                          </h4>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              service.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {service.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {service.customer_description && (
                          <p className="mt-2 text-gray-600 text-sm">
                            {service.customer_description}
                          </p>
                        )}
                        {service.estimated_hours && (
                          <p className="mt-2 text-sm text-gray-500">
                            Estimated: {service.estimated_hours} hours
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => toggleActive(service.id, service.is_active)}
                          className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                        >
                          {service.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <Link
                          href={`/admin/services/${service.id}`}
                          className="px-3 py-1 text-sm text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/admin/services/${service.id}/sops`}
                          className="px-3 py-1 text-sm text-purple-700 bg-purple-50 rounded hover:bg-purple-100 transition-colors"
                        >
                          SOPs
                        </Link>
                        {deleteConfirm === service.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDelete(service.id)}
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
                            onClick={() => setDeleteConfirm(service.id)}
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
