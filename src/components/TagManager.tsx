'use client'

import { useState } from 'react'
import type { Tag } from '@/lib/types'

interface TagManagerProps {
  initialTags: Tag[]
}

export default function TagManager({ initialTags }: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>(initialTags)
  const [newTagName, setNewTagName] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAddTag(e: React.FormEvent) {
    e.preventDefault()
    if (!newTagName.trim()) return

    setAdding(true)
    setError(null)
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to create tag')
      }

      const newTag = await res.json()
      setTags((prev) => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)))
      setNewTagName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag')
    } finally {
      setAdding(false)
    }
  }

  async function handleDeleteTag(id: string) {
    if (!confirm('Delete this tag? Recipes using it will lose this tag.')) return

    try {
      const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to delete tag')
      }
      setTags((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tag')
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Existing Tags
        </h2>
        {tags.length === 0 ? (
          <p className="text-gray-500 text-sm">No tags yet.</p>
        ) : (
          <ul className="space-y-2">
            {tags.map((tag) => (
              <li
                key={tag.id}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3"
              >
                <span className="font-medium text-gray-800">{tag.name}</span>
                <button
                  onClick={() => handleDeleteTag(tag.id)}
                  className="text-sm text-red-600 hover:text-red-800 transition-colors"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={handleAddTag} className="flex gap-2">
        <input
          type="text"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="New tag name"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={adding || !newTagName.trim()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {adding ? 'Adding...' : 'Add Tag'}
        </button>
      </form>
    </div>
  )
}
