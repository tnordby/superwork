'use client'

import { useState, useEffect, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { computeVisibleIntakeFieldNames } from '@/lib/intake/compute-visible-intake-fields'
import {
  pickVisibleIntakeResponses,
  validateIntakeResponses,
} from '@/lib/intake/validate-intake-responses'

/** Single value for a dynamic intake field (JSON-serializable). */
export type IntakeResponseValue = string | number | boolean | string[] | undefined

/** All responses keyed by field name. */
export type IntakeResponseMap = Record<string, IntakeResponseValue>

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
  validation?: Record<string, unknown>
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
  onSubmit: (responses: IntakeResponseMap) => void
  loading: boolean
}

export default function DynamicIntakeForm({
  serviceTemplateId,
  onSubmit,
  loading,
}: DynamicIntakeFormProps) {
  const [fields, setFields] = useState<IntakeFormField[]>([])
  const [conditions, setConditions] = useState<IntakeFormCondition[]>([])
  const [responses, setResponses] = useState<IntakeResponseMap>({})
  const [formLoading, setFormLoading] = useState(true)
  const [submitError, setSubmitError] = useState<string | null>(null)

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
          const initialResponses: IntakeResponseMap = {}
          data.fields.forEach((field: IntakeFormField) => {
            if (field.default_value) {
              initialResponses[field.field_name] = field.default_value
            } else if (field.field_type === 'multiselect') {
              initialResponses[field.field_name] = []
            }
          })
          setResponses(initialResponses)
        }
      } catch (error) {
        console.error('Error fetching intake form:', error)
      } finally {
        setFormLoading(false)
      }
    }

    fetchIntakeForm()
  }, [serviceTemplateId])

  const visibleFieldNames = useMemo(() => {
    const fieldNames = fields.map((f) => f.field_name)
    const visibilityConditions = conditions.map((c) => ({
      trigger_field_name: c.trigger_field_name,
      trigger_value: c.trigger_value,
      action: c.action,
      target_field_names: c.target_field_names,
    }))
    return computeVisibleIntakeFieldNames(fieldNames, visibilityConditions, responses)
  }, [fields, conditions, responses])

  const handleFieldChange = (fieldName: string, value: IntakeResponseValue) => {
    setSubmitError(null)
    setResponses((prev) => ({
      ...prev,
      [fieldName]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validateIntakeResponses(fields, responses, visibleFieldNames)
    if (validationError) {
      setSubmitError(validationError)
      return
    }
    setSubmitError(null)
    onSubmit(pickVisibleIntakeResponses(responses, visibleFieldNames))
  }

  const renderField = (field: IntakeFormField) => {
    if (!visibleFieldNames.has(field.field_name)) {
      return null
    }

    const effectiveRequired = field.is_required && visibleFieldNames.has(field.field_name)
    const value = responses[field.field_name]
    const textLikeValue =
      value === undefined || value === null ? '' : typeof value === 'string' ? value : String(value)
    const validation = field.validation
    const validationMin =
      validation && typeof validation.min === 'number' ? validation.min : undefined
    const validationMax =
      validation && typeof validation.max === 'number' ? validation.max : undefined

    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'url':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {field.label} {effectiveRequired && <span className="text-red-500">*</span>}
            </label>
            <input
              type={field.field_type}
              value={textLikeValue}
              onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
              required={effectiveRequired}
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
              {field.label} {effectiveRequired && <span className="text-red-500">*</span>}
            </label>
            <input
              type="number"
              value={textLikeValue}
              onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
              required={effectiveRequired}
              placeholder={field.placeholder}
              min={validationMin}
              max={validationMax}
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
              {field.label} {effectiveRequired && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={textLikeValue}
              onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
              required={effectiveRequired}
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
              {field.label} {effectiveRequired && <span className="text-red-500">*</span>}
            </label>
            <select
              value={textLikeValue}
              onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
              required={effectiveRequired}
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
              {field.label} {effectiveRequired && <span className="text-red-500">*</span>}
            </label>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={field.field_name}
                    value={option}
                    checked={textLikeValue === option}
                    onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
                    required={effectiveRequired}
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
                required={effectiveRequired}
                className="w-4 h-4 text-gray-900 rounded focus:ring-gray-900"
              />
              <span className="text-sm font-medium text-gray-900">
                {field.label} {effectiveRequired && <span className="text-red-500">*</span>}
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
              {field.label} {effectiveRequired && <span className="text-red-500">*</span>}
            </label>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Array.isArray(value) ? value.includes(option) : false}
                    onChange={(e) => {
                      const currentValues = Array.isArray(value) ? value : []
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
      {submitError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
        </div>
      )}
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
