import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { ADMIN_EMAILS } from '@/lib/constants'
import TagManager from '@/components/TagManager'
import type { Tag } from '@/lib/types'

async function getTags(): Promise<Tag[]> {
  const service = createServiceSupabaseClient()
  const { data } = await service
    .from('tags')
    .select('*')
    .order('name', { ascending: true })
  return data ?? []
}

export default async function AdminTagsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email || !ADMIN_EMAILS.includes(user.email)) {
    redirect('/recipes')
  }

  const tags = await getTags()

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Manage Tags</h1>
      <TagManager initialTags={tags} />
    </div>
  )
}
