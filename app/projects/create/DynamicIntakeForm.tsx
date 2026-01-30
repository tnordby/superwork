'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface IntakeFormField {
  id: string
  field_name: string
  field_type: string
  label: string
  placeholder?: string
  help_text?: string
  is_required: boolean
  order_index: number
  options?: string[]
  validation?: Record<string, any>
  default_value?: string
}

interface IntakeFormCondition {
  id: string
  trigger_field_name: string
  trigger_value: string
  action: string
  target_field_names: string[]
}

interface DynamicIntakeFormProps {
  serviceTemplateId: string
  onSubmit: (responses: Record<string, any>) => void
  loading: boolean
}

export default function DynamicIntakeForm({
  serviceTemplateId,
  onSubmit,
  loading,
}: DynamicIntakeFormProps) {
  const [fields, setFields] = useState<IntakeFormField[]>([])
  const [conditions, setConditions] = useState<IntakeFormCondition[]>([])
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set())
  const [formLoading, setFormLoading] = useState(true)

  // Fetch intake form configuration
  useEffect(() => {
    async function fetchIntakeForm() {
      try {
        const response = await fetch(`/api/services/${serviceTemplateId}/intake-form`)
        const data = await response.json()

        if (response.ok && data.fields) {
          setFields(data.fields)
          setConditions(data.conditions || [])

          // Initialize responses with default values
          const initialResponses: Record<string, any> = {}
          data.fields.forEach((field: IntakeFormField) => {
            if (field.default_value) {
              initialResponses[field.field_name] = field.default_value
            } else if (field.field_type === 'multiselect') {
              initialResponses[field.field_name] = []
            }
          })
          setResponses(initialResponses)

          // Initialize visible fields (all required fields + non-conditional fields)
          const initialVisible = new Set<string>()
          data.fields.forEach((field: IntakeFormField) => {
            initialVisible.add(field.field_name)
          })
          setVisibleFields(initialVisible)
        }
      } catch (error) {
        console.error('Error fetching intake form:', error)
      } finally {
        setFormLoading(false)
      }
    }

    fetchIntakeForm()
  }, [serviceTemplateId])

  // Update visible fields based on conditional logic
  useEffect(() => {
    const newVisibleFields = new Set(visibleFields)

    conditions.forEach((condition) => {
      const triggerValue = responses[condition.trigger_field_name]

      if (triggerValue === condition.trigger_value) {
        if (condition.action === 'show') {
          condition.target_field_names.forEach((name) => newVisibleFields.add(name))
        } else if (condition.action === 'hide') {
          condition.target_field_names.forEach((name) => newVisibleFields.delete(name))
        }
      } else {
        // Reverse the condition if trigger doesn't match
        if (condition.action === 'show') {
          condition.target_field_names.forEach((name) => newVisibleFields.delete(name))
        } else if (condition.action === 'hide') {
          condition.target_field_names.forEach((name) => newVisibleFields.add(name))
        }
      }
    })

    setVisibleFields(newVisibleFields)
  }, [responses, conditions])

  const handleFieldChange = (fieldName: string, value: any) => {
    setResponses((prev) => ({
      ...prev,
      [fieldName]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(responses)
  }

  const renderField = (field: IntakeFormField) => {
    if (!visibleFields.has(field.field_name)) {
      return null
    }

    const value = responses[field.field_name] ?? ''

    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'url':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {field.label} {field.is_required && <span className="text-red-500">*</span>}
            </label>
            <input
              type={field.field_type}
              value={value}
              onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
              required={field.is_required}
              placeholder={field.placeholder}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
            {field.help_text && (
              <p className="mt-1 text-xs text-gray-500">{field.help_text}</p>
            )}
          </div>
        )

      case 'number':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {field.label} {field.is_required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
              required={field.is_required}
              placeholder={field.placeholder}
              min={field.validation?.min}
              max={field.validation?.max}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
            {field.help_text && (
              <p className="mt-1 text-xs text-gray-500">{field.help_text}</p>
            )}
          </div>
        )

      case 'textarea':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {field.label} {field.is_required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={value}
              onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
              required={field.is_required}
              placeholder={field.placeholder}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
            {field.help_text && (
              <p className="mt-1 text-xs text-gray-500">{field.help_text}</p>
            )}
          </div>
        )

      case 'select':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {field.label} {field.is_required && <span className="text-red-500">*</span>}
            </label>
            <select
              value={value}
              onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
              required={field.is_required}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              <option value="">Select an option</option>
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {field.help_text && (
              <p className="mt-1 text-xs text-gray-500">{field.help_text}</p>
            )}
          </div>
        )

      case 'radio':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {field.label} {field.is_required && <span className="text-red-500">*</span>}
            </label>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={field.field_name}
                    value={option}
                    checked={value === option}
                    onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
                    required={field.is_required}
                    className="w-4 h-4 text-gray-900 focus:ring-gray-900"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
            {field.help_text && (
              <p className="mt-1 text-xs text-gray-500">{field.help_text}</p>
            )}
          </div>
        )

      case 'checkbox':
        return (
          <div key={field.id}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={value === true || value === 'true'}
                onChange={(e) => handleFieldChange(field.field_name, e.target.checked)}
                required={field.is_required}
                className="w-4 h-4 text-gray-900 rounded focus:ring-gray-900"
              />
              <span className="text-sm font-medium text-gray-900">
                {field.label} {field.is_required && <span className="text-red-500">*</span>}
              </span>
            </label>
            {field.help_text && (
              <p className="mt-1 text-xs text-gray-500 ml-6">{field.help_text}</p>
            )}
          </div>
        )

      case 'multiselect':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {field.label} {field.is_required && <span className="text-red-500">*</span>}
            </label>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(value as string[])?.includes(option) || false}
                    onChange={(e) => {
                      const currentValues = (value as string[]) || []
                      if (e.target.checked) {
                        handleFieldChange(field.field_name, [...currentValues, option])
                      } else {
                        handleFieldChange(
                          field.field_name,
                          currentValues.filter((v) => v !== option)
                        )
                      }
                    }}
                    className="w-4 h-4 text-gray-900 rounded focus:ring-gray-900"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
            {field.help_text && (
              <p className="mt-1 text-xs text-gray-500">{field.help_text}</p>
            )}
          </div>
        )

      default:
        return null
    }
  }

  if (formLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (fields.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No intake form configured for this service.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {fields.map((field) => renderField(field))}

      <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-[#bfe937] px-6 py-3 text-sm font-medium text-gray-900 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating Project...
            </>
          ) : (
            'Create Project'
          )}
        </button>
      </div>
    </form>
  )
}
