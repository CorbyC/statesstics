import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { ADMIN_EMAILS } from '@/lib/constants'
import type { RecipeDetail, RatingWithUser } from '@/lib/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const service = createServiceSupabaseClient()
    const { id } = params

    // Fetch recipe
    const { data: recipe, error: recipeError } = await service
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()

    if (recipeError || !recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    // Fetch tags
    const { data: recipeTags, error: rtError } = await service
      .from('recipe_tags')
      .select('tags(id, name, created_at)')
      .eq('recipe_id', id)

    if (rtError) throw rtError

    const tags = (recipeTags ?? [])
      .map((rt) => rt.tags as unknown as { id: string; name: string; created_at: string })
      .filter(Boolean) as { id: string; name: string; created_at: string }[]

    // Fetch ratings
    const { data: ratings, error: ratingsError } = await service
      .from('ratings')
      .select('*')
      .eq('recipe_id', id)

    if (ratingsError) throw ratingsError

    // Get user emails via admin API
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

    const result: RecipeDetail = {
      ...recipe,
      tags,
      avg_rating,
      rating_count: ratingsWithUsers.length,
      ratings: ratingsWithUsers,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/recipes/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipe' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params
    const body = await request.json()
    const { title, description, image_url, tag_ids } = body as {
      title?: string
      description?: string
      image_url?: string | null
      tag_ids?: string[]
    }

    const service = createServiceSupabaseClient()

    // Update recipe fields
    const updates: Record<string, string | null | undefined> = {}
    if (title !== undefined) updates.title = title.trim()
    if (description !== undefined) updates.description = description.trim()
    if (image_url !== undefined) updates.image_url = image_url

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await service
        .from('recipes')
        .update(updates)
        .eq('id', id)

      if (updateError) throw updateError
    }

    // Update tags if provided
    if (tag_ids !== undefined) {
      if (tag_ids.length === 0) {
        return NextResponse.json(
          { error: 'At least one tag is required' },
          { status: 400 }
        )
      }

      // Delete existing tags
      await service.from('recipe_tags').delete().eq('recipe_id', id)

      // Insert new tags
      const recipeTags = tag_ids.map((tag_id) => ({ recipe_id: id, tag_id }))
      const { error: tagsError } = await service
        .from('recipe_tags')
        .insert(recipeTags)

      if (tagsError) throw tagsError
    }

    const { data: updated, error: fetchError } = await service
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/recipes/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update recipe' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params
    const service = createServiceSupabaseClient()

    const { error } = await service.from('recipes').delete().eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/recipes/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete recipe' },
      { status: 500 }
    )
  }
}
