'use client'

import { useState } from 'react'
import type { Recipe } from '@/lib/types'

interface ProxyRatingFormProps {
  recipes: Recipe[]
}

const RATING_LABELS: Record<number, string> = {
  0: 'Not for me',
  1: 'Good',
  2: 'Great',
}

export default function ProxyRatingForm({ recipes }: ProxyRatingFormProps) {
  const [email, setEmail] = useState('')
  const [recipeId, setRecipeId] = useState('')
  const [value, setValue] = useState<number | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!email.trim()) {
      setError('Email is required')
      return
    }
    if (!recipeId) {
      setError('Please select a recipe')
      return
    }
    if (value === '') {
      setError('Please select a rating')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/proxy-rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), recipeId, value }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to submit proxy rating')
      }

      const recipeName = recipes.find((r) => r.id === recipeId)?.title ?? recipeId
      setSuccess(
        `Rating ${value} submitted for ${email.trim()} on "${recipeName}"`
      )
      setEmail('')
      setRecipeId('')
      setValue('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit proxy rating')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm">
          {success}
        </div>
      )}

      <div>
        <label
          htmlFor="proxy-email"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          User Email <span className="text-red-500">*</span>
        </label>
        <input
          id="proxy-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required
        />
      </div>

      <div>
        <label
          htmlFor="proxy-recipe"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Recipe <span className="text-red-500">*</span>
        </label>
        <select
          id="proxy-recipe"
          value={recipeId}
          onChange={(e) => setRecipeId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required
        >
          <option value="">Select a recipe</option>
          {recipes.map((recipe) => (
            <option key={recipe.id} value={recipe.id}>
              {recipe.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-2">
            Rating (0–2) <span className="text-red-500">*</span>
          </legend>
          <div className="flex gap-2">
            {[0, 1, 2].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setValue(v)}
                className={`flex flex-col items-center px-4 py-3 rounded-lg border-2 transition-all font-medium text-sm ${
                  value === v
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg font-bold">{v}</span>
                <span className="text-xs mt-0.5">{RATING_LABELS[v]}</span>
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Submitting...' : 'Submit Proxy Rating'}
      </button>
    </form>
  )
}
