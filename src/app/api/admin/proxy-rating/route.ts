import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { ADMIN_EMAILS, MAX_RATING_USER } from '@/lib/constants'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user: adminUser },
    } = await supabase.auth.getUser()

    if (!adminUser || !adminUser.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!ADMIN_EMAILS.includes(adminUser.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { email, recipeId, value } = body as {
      email: string
      recipeId: string
      value: number
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      )
    }

    if (!recipeId) {
      return NextResponse.json(
        { error: 'Recipe ID is required' },
        { status: 400 }
      )
    }

    if (
      value === undefined ||
      value === null ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > MAX_RATING_USER
    ) {
      return NextResponse.json(
        { error: `Proxy rating must be an integer between 0 and ${MAX_RATING_USER}` },
        { status: 400 }
      )
    }

    const service = createServiceSupabaseClient()

    // Find target user by email
    const { data: usersData, error: usersError } =
      await service.auth.admin.listUsers({ perPage: 1000 })

    if (usersError) throw usersError

    const targetUser = usersData.users.find(
      (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
    )

    if (!targetUser) {
      return NextResponse.json(
        { error: `No user found with email: ${email}` },
        { status: 404 }
      )
    }

    // Upsert rating on behalf of target user
    const { data, error } = await service
      .from('ratings')
      .upsert(
        {
          recipe_id: recipeId,
          user_id: targetUser.id,
          rated_by_id: adminUser.id,
          value,
        },
        { onConflict: 'recipe_id,user_id' }
      )
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ rating: data })
  } catch (error) {
    console.error('POST /api/admin/proxy-rating error:', error)
    return NextResponse.json(
      { error: 'Failed to save proxy rating' },
      { status: 500 }
    )
  }
}
