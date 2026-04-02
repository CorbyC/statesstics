import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { ADMIN_EMAILS } from '@/lib/constants'
import RecipeForm from '@/components/RecipeForm'
import type { Tag } from '@/lib/types'

export default async function EditRecipePage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email || !ADMIN_EMAILS.includes(user.email)) {
    redirect('/recipes')
  }

  const service = createServiceSupabaseClient()

  const [{ data: recipe, error }, { data: allTags }, { data: recipeTags }] =
    await Promise.all([
      service.from('recipes').select('*').eq('id', params.id).single(),
      service.from('tags').select('*').order('name', { ascending: true }),
      service
        .from('recipe_tags')
        .select('tags(id, name, created_at)')
        .eq('recipe_id', params.id),
    ])

  if (error || !recipe) {
    notFound()
  }

  const tags: Tag[] = allTags ?? []
  const recipeTacArr: Tag[] = (recipeTags ?? [])
    .map((rt) => rt.tags as unknown as Tag)
    .filter(Boolean) as Tag[]

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Recipe</h1>
      <RecipeForm recipe={{ ...recipe, tags: recipeTacArr }} tags={tags} />
    </div>
  )
}
