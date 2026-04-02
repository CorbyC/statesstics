import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { ADMIN_EMAILS } from '@/lib/constants'
import AdminRecipeList from '@/components/AdminRecipeList'
import type { RecipeWithDetails } from '@/lib/types'

async function getRecipes(): Promise<RecipeWithDetails[]> {
  const service = createServiceSupabaseClient()

  const { data: recipes } = await service
    .from('recipes')
    .select('*')
    .order('created_at', { ascending: false })

  if (!recipes) return []

  const { data: recipeTags } = await service
    .from('recipe_tags')
    .select('recipe_id, tags(id, name, created_at)')

  const { data: ratings } = await service
    .from('ratings')
    .select('recipe_id, value')

  return recipes.map((recipe) => {
    const tags = (recipeTags ?? [])
      .filter((rt) => rt.recipe_id === recipe.id)
      .map((rt) => rt.tags as unknown as { id: string; name: string; created_at: string })
      .filter(Boolean) as { id: string; name: string; created_at: string }[]

    const recipeRatings = (ratings ?? []).filter(
      (r) => r.recipe_id === recipe.id
    )
    const avg_rating =
      recipeRatings.length > 0
        ? recipeRatings.reduce((sum, r) => sum + r.value, 0) /
          recipeRatings.length
        : null

    return {
      ...recipe,
      tags,
      avg_rating,
      rating_count: recipeRatings.length,
    }
  })
}

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email || !ADMIN_EMAILS.includes(user.email)) {
    redirect('/recipes')
  }

  const recipes = await getRecipes()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage recipes, tags, and ratings</p>
        </div>
        <Link
          href="/admin/recipes/new"
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          + New Recipe
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <Link
          href="/admin/recipes/new"
          className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
        >
          <h2 className="font-semibold text-gray-900 mb-1">Create Recipe</h2>
          <p className="text-sm text-gray-500">Add a new recipe to the catalog</p>
        </Link>
        <Link
          href="/admin/tags"
          className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
        >
          <h2 className="font-semibold text-gray-900 mb-1">Manage Tags</h2>
          <p className="text-sm text-gray-500">Add or remove recipe tags</p>
        </Link>
        <Link
          href="/admin/ratings"
          className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
        >
          <h2 className="font-semibold text-gray-900 mb-1">Proxy Ratings</h2>
          <p className="text-sm text-gray-500">Submit ratings on behalf of users</p>
        </Link>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          All Recipes ({recipes.length})
        </h2>
        <AdminRecipeList recipes={recipes} />
      </div>
    </div>
  )
}
