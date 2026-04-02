'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { RecipeWithDetails } from '@/lib/types'

interface AdminRecipeListProps {
  recipes: RecipeWithDetails[]
}

export default function AdminRecipeList({ recipes: initialRecipes }: AdminRecipeListProps) {
  const router = useRouter()
  const [recipes, setRecipes] = useState(initialRecipes)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return

    setDeletingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/recipes/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to delete recipe')
      }
      setRecipes((prev) => prev.filter((r) => r.id !== id))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete recipe')
    } finally {
      setDeletingId(null)
    }
  }

  if (recipes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No recipes yet.</p>
        <Link
          href="/admin/recipes/new"
          className="mt-3 inline-block text-indigo-600 hover:underline"
        >
          Create your first recipe
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}
      {recipes.map((recipe) => (
        <div
          key={recipe.id}
          className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4"
        >
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{recipe.title}</h3>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {recipe.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full"
                >
                  {tag.name}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {recipe.rating_count} rating{recipe.rating_count !== 1 ? 's' : ''}
              {recipe.avg_rating !== null && (
                <> &middot; avg {recipe.avg_rating.toFixed(1)}</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/recipes/${recipe.id}`}
              className="text-sm text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              View
            </Link>
            <Link
              href={`/admin/recipes/${recipe.id}/edit`}
              className="text-sm text-indigo-600 hover:text-indigo-800 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              Edit
            </Link>
            <button
              onClick={() => handleDelete(recipe.id, recipe.title)}
              disabled={deletingId === recipe.id}
              className="text-sm text-red-600 hover:text-red-800 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {deletingId === recipe.id ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
