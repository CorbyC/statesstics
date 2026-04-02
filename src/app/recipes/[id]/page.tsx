import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ADMIN_EMAILS } from '@/lib/constants'
import RatingWidget from '@/components/RatingWidget'
import AdminRatingWidget from '@/components/AdminRatingWidget'
import type { RecipeDetail, RatingWithUser } from '@/lib/types'

async function getRecipeDetail(id: string): Promise<RecipeDetail | null> {
  const service = createServiceSupabaseClient()

  const { data: recipe, error } = await service
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !recipe) return null

  const { data: recipeTags } = await service
    .from('recipe_tags')
    .select('tags(id, name, created_at)')
    .eq('recipe_id', id)

  const tags = (recipeTags ?? [])
    .map((rt) => rt.tags as unknown as { id: string; name: string; created_at: string })
    .filter(Boolean) as { id: string; name: string; created_at: string }[]

  const { data: ratings } = await service
    .from('ratings')
    .select('*')
    .eq('recipe_id', id)

  // Build email map from all user ids
  const allUserIds = Array.from(new Set([
    ...(ratings ?? []).map((r) => r.user_id),
    ...(ratings ?? []).map((r) => r.rated_by_id),
  ]))

  const userEmailMap: Record<string, string> = {}
  if (allUserIds.length > 0) {
    const { data: usersData } = await service.auth.admin.listUsers({
      perPage: 1000,
    })
    for (const u of usersData?.users ?? []) {
      userEmailMap[u.id] = u.email ?? u.id
    }
  }

  const ratingsWithUsers: RatingWithUser[] = (ratings ?? []).map((r) => ({
    ...r,
    user_email: userEmailMap[r.user_id] ?? r.user_id,
    rated_by_email: userEmailMap[r.rated_by_id] ?? r.rated_by_id,
  }))

  const avg_rating =
    ratingsWithUsers.length > 0
      ? ratingsWithUsers.reduce((sum, r) => sum + r.value, 0) /
        ratingsWithUsers.length
      : null

  return {
    ...recipe,
    tags,
    avg_rating,
    rating_count: ratingsWithUsers.length,
    ratings: ratingsWithUsers,
  }
}

export default async function RecipeDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const [recipe, supabase] = await Promise.all([
    getRecipeDetail(params.id),
    createServerSupabaseClient(),
  ])

  if (!recipe) {
    notFound()
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAdmin = user?.email ? ADMIN_EMAILS.includes(user.email) : false

  // Get current user's own rating
  const myRating = user
    ? recipe.ratings.find((r) => r.user_id === user.id)?.value ?? null
    : null

  const RATING_LABELS: Record<number, string> = {
    0: 'Not for me',
    1: 'Good',
    2: 'Great',
    3: 'Amazing',
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link
          href="/recipes"
          className="text-sm text-indigo-600 hover:underline"
        >
          &larr; Back to recipes
        </Link>
      </div>

      {recipe.image_url && (
        <div className="mb-6 rounded-xl overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full max-h-80 object-cover"
          />
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-900">{recipe.title}</h1>
          {isAdmin && (
            <Link
              href={`/admin/recipes/${recipe.id}/edit`}
              className="shrink-0 text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Edit
            </Link>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {recipe.tags.map((tag) => (
            <span
              key={tag.id}
              className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium"
            >
              {tag.name}
            </span>
          ))}
        </div>

        <div className="mt-4 text-sm text-gray-600">
          {recipe.rating_count > 0 ? (
            <span>
              Average rating:{' '}
              <span className="font-semibold text-gray-900">
                {recipe.avg_rating!.toFixed(1)}
              </span>{' '}
              / 3{' '}
              <span className="text-gray-400">
                ({recipe.rating_count} rating{recipe.rating_count !== 1 ? 's' : ''})
              </span>
            </span>
          ) : (
            <span className="text-gray-400">No ratings yet</span>
          )}
        </div>
      </div>

      <div className="prose prose-gray max-w-none mb-8">
        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
          {recipe.description}
        </p>
      </div>

      {/* Rating widget */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        {isAdmin ? (
          <AdminRatingWidget recipeId={recipe.id} initialValue={myRating} />
        ) : (
          <RatingWidget recipeId={recipe.id} initialValue={myRating} />
        )}
      </div>

      {/* Individual ratings (admin view) */}
      {isAdmin && recipe.ratings.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            All Ratings
          </h2>
          <div className="space-y-3">
            {recipe.ratings.map((rating) => (
              <div
                key={rating.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {rating.user_email}
                  </p>
                  {rating.rated_by_id !== rating.user_id && (
                    <p className="text-xs text-gray-500">
                      Rated by {rating.rated_by_email}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{rating.value}</span>
                  <span className="text-sm text-gray-500">
                    — {RATING_LABELS[rating.value] ?? rating.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
