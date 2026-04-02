import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { ADMIN_EMAILS } from '@/lib/constants'
import ProxyRatingForm from '@/components/ProxyRatingForm'
import type { Recipe } from '@/lib/types'

async function getRecipes(): Promise<Recipe[]> {
  const service = createServiceSupabaseClient()
  const { data } = await service
    .from('recipes')
    .select('*')
    .order('title', { ascending: true })
  return data ?? []
}

export default async function AdminRatingsPage() {
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
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Proxy Ratings</h1>
      <p className="text-gray-500 mb-8">
        Submit a rating (0–2) on behalf of a registered user by their email address.
      </p>
      <ProxyRatingForm recipes={recipes} />
    </div>
  )
}
