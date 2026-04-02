'use client'

import { useState } from 'react'

interface AdminRatingWidgetProps {
  recipeId: string
  initialValue: number | null
}

const RATING_LABELS: Record<number, string> = {
  0: 'Not for me',
  1: 'Good',
  2: 'Great',
  3: 'Amazing',
}

export default function AdminRatingWidget({
  recipeId,
  initialValue,
}: AdminRatingWidgetProps) {
  const [selected, setSelected] = useState<number | null>(initialValue)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRating(value: number) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/recipes/${recipeId}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save rating')
      }
      setSelected(value)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rating')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">
        Your rating{' '}
        <span className="text-xs text-indigo-600 font-normal">(Admin — 0–3)</span>
      </p>
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((value) => (
          <button
            key={value}
            onClick={() => handleRating(value)}
            disabled={loading}
            className={`flex flex-col items-center px-4 py-3 rounded-lg border-2 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              selected === value
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-gray-50'
            }`}
          >
            <span className="text-lg font-bold">{value}</span>
            <span className="text-xs mt-0.5">{RATING_LABELS[value]}</span>
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {selected !== null && !error && (
        <p className="text-sm text-green-600">
          Rating saved: {selected} — {RATING_LABELS[selected]}
        </p>
      )}
    </div>
  )
}
