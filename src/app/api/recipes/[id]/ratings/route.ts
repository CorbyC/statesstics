import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { ADMIN_EMAILS, MAX_RATING_ADMIN, MAX_RATING_USER } from '@/lib/constants'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceSupabaseClient()
    const { id } = params

    const { data, error } = await service
      .from('ratings')
      .select('*')
      .eq('recipe_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({ rating: data })
  } catch (error) {
    console.error('GET /api/recipes/[id]/ratings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rating' },
      { status: 500 }
    )
  }
}

export async function POST(
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

    const { id } = params
    const body = await request.json()
    const { value } = body as { value: number }

    if (value === undefined || value === null || typeof value !== 'number') {
      return NextResponse.json(
        { error: 'Rating value is required' },
        { status: 400 }
      )
    }

    const isAdmin = ADMIN_EMAILS.includes(user.email)
    const maxRating = isAdmin ? MAX_RATING_ADMIN : MAX_RATING_USER

    if (value < 0 || value > maxRating || !Number.isInteger(value)) {
      return NextResponse.json(
        { error: `Rating must be an integer between 0 and ${maxRating}` },
        { status: 400 }
      )
    }

    const service = createServiceSupabaseClient()

    const { data, error } = await service
      .from('ratings')
      .upsert(
        {
          recipe_id: id,
          user_id: user.id,
          rated_by_id: user.id,
          value,
        },
        { onConflict: 'recipe_id,user_id' }
      )
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ rating: data })
  } catch (error) {
    console.error('POST /api/recipes/[id]/ratings error:', error)
    return NextResponse.json(
      { error: 'Failed to save rating' },
      { status: 500 }
    )
  }
}
