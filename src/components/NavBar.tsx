'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

interface NavBarProps {
  userEmail: string
  isAdmin: boolean
}

export default function NavBar({ userEmail, isAdmin }: NavBarProps) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/recipes"
            className="text-xl font-bold text-gray-900 hover:text-gray-700"
          >
            Statesstics
          </Link>
          <Link
            href="/recipes"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Recipes
          </Link>
          {isAdmin && (
            <>
              <Link
                href="/admin"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Admin
              </Link>
              <Link
                href="/admin/tags"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Tags
              </Link>
              <Link
                href="/admin/ratings"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Proxy Ratings
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{userEmail}</span>
          {isAdmin && (
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
              Admin
            </span>
          )}
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
