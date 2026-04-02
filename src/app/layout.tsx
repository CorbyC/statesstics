import type { Metadata } from 'next'
import './globals.css'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ADMIN_EMAILS } from '@/lib/constants'
import NavBar from '@/components/NavBar'

export const metadata: Metadata = {
  title: 'Statesstics',
  description: 'A recipe rating app',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAdmin = user?.email ? ADMIN_EMAILS.includes(user.email) : false
  const userEmail = user?.email ?? null

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {user && userEmail && (
          <NavBar userEmail={userEmail} isAdmin={isAdmin} />
        )}
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
