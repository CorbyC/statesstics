import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { ADMIN_EMAILS } from '@/lib/constants'
import type { RecipeWithDetails } from '@/lib/types'

export async function GET() {
  try {
    const service = createServiceSupabaseClient()

    // Fetch all recipes
    const { data: recipes, error: recipesError } = await service
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false })

    if (recipesError) throw recipesError

    // Fetch all recipe_tags with tag info
    const { data: recipeTags, error: rtError } = await service
      .from('recipe_tags')
      .select('recipe_id, tags(id, name, created_at)')

    if (rtError) throw rtError

    // Fetch all ratings for aggregate
    const { data: ratings, error: ratingsError } = await service
      .from('ratings')
      .select('recipe_id, value')

    if (ratingsError) throw ratingsError

    // Build response
    const result: RecipeWithDetails[] = (recipes ?? []).map((recipe) => {
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

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/recipes error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, image_url, tag_ids } = body as {
      title: string
      description: string
      image_url?: string
      tag_ids: string[]
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    if (!tag_ids || tag_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one tag is required' },
        { status: 400 }
      )
    }

    const service = createServiceSupabaseClient()

    // Create recipe
    const { data: recipe, error: recipeError } = await service
      .from('recipes')
      .insert({
        title: title.trim(),
        description: description.trim(),
        image_url: image_url ?? null,
      })
      .select()
      .single()

    if (recipeError) throw recipeError

    // Create recipe_tags
    const recipeTags = tag_ids.map((tag_id) => ({
      recipe_id: recipe.id,
      tag_id,
    }))

    const { error: tagsError } = await service
      .from('recipe_tags')
      .insert(recipeTags)

    if (tagsError) throw tagsError

    return NextResponse.json(recipe, { status: 201 })
  } catch (error) {
    console.error('POST /api/recipes error:', error)
    return NextResponse.json(
      { error: 'Failed to create recipe' },
      { status: 500 }
    )
  }
}
