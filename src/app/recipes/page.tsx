import { createServiceSupabaseClient } from '@/lib/supabase/service'
import RecipeCard from '@/components/RecipeCard'
import type { RecipeWithDetails } from '@/lib/types'

async function getRecipesWithDetails(): Promise<RecipeWithDetails[]> {
  const service = createServiceSupabaseClient()

  const { data: recipes, error: recipesError } = await service
    .from('recipes')
    .select('*')
    .order('created_at', { ascending: false })

  if (recipesError || !recipes) return []

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

export default async function RecipesPage() {
  const recipes = await getRecipesWithDetails()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Recipes</h1>
        <p className="text-gray-500 mt-1">
          {recipes.length} recipe{recipes.length !== 1 ? 's' : ''} in the catalog
        </p>
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg">No recipes yet.</p>
          <p className="text-sm mt-1">Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  )
}
