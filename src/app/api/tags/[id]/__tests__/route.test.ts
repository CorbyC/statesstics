/**
 * Tests for DELETE /api/tags/[id]
 */

const mockServiceFrom = jest.fn()
const mockServiceClient = { from: mockServiceFrom }
jest.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: () => mockServiceClient,
}))

const mockServerGetUser = jest.fn()
const mockServerClient = { auth: { getUser: mockServerGetUser } }
jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => mockServerClient,
}))

jest.mock('next/headers', () => ({
  cookies: () => ({ get: jest.fn(), set: jest.fn(), delete: jest.fn() }),
}))

import { DELETE } from '@/app/api/tags/[id]/route'
import { NextRequest } from 'next/server'

const params = { id: 'tag-uuid-1' }

describe('DELETE /api/tags/[id]', () => {
  beforeEach(() => jest.clearAllMocks())

  function makeRequest() {
    return new NextRequest(`http://localhost/api/tags/${params.id}`, {
      method: 'DELETE',
    })
  }

  it('returns 401 when user is not authenticated', async () => {
    mockServerGetUser.mockResolvedValue({ data: { user: null } })

    const response = await DELETE(makeRequest(), { params })
    expect(response.status).toBe(401)
  })

  it('returns 403 when non-admin tries to delete a tag', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'user@example.com' } },
    })

    const response = await DELETE(makeRequest(), { params })
    expect(response.status).toBe(403)
  })

  it('returns 200 when admin deletes a tag successfully (first admin)', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'admin1', email: 'tesscampbell30@gmail.com' } },
    })

    mockServiceFrom.mockReturnValue({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    })

    const response = await DELETE(makeRequest(), { params })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
  })

  it('returns 200 when admin deletes a tag successfully (second admin)', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'admin2', email: 'corbyagain@gmail.com' } },
    })

    mockServiceFrom.mockReturnValue({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    })

    const response = await DELETE(makeRequest(), { params })
    expect(response.status).toBe(200)
  })

  it('returns 500 when database error occurs during deletion', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'admin1', email: 'tesscampbell30@gmail.com' } },
    })

    mockServiceFrom.mockReturnValue({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'foreign key violation' } }),
    })

    const response = await DELETE(makeRequest(), { params })
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Failed to delete tag')
  })
})
