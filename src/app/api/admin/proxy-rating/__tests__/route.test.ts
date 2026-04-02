/**
 * Tests for POST /api/admin/proxy-rating
 */

const mockServiceFrom = jest.fn()
const mockListUsers = jest.fn()
const mockServiceClient = {
  from: mockServiceFrom,
  auth: { admin: { listUsers: mockListUsers } },
}
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

import { POST } from '@/app/api/admin/proxy-rating/route'
import { NextRequest } from 'next/server'

describe('POST /api/admin/proxy-rating', () => {
  beforeEach(() => jest.clearAllMocks())

  function makeRequest(body: object) {
    return new NextRequest('http://localhost/api/admin/proxy-rating', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  it('returns 401 when user is not authenticated', async () => {
    mockServerGetUser.mockResolvedValue({ data: { user: null } })

    const response = await POST(makeRequest({ email: 'target@example.com', recipeId: 'r1', value: 1 }))
    expect(response.status).toBe(401)
  })

  it('returns 403 when non-admin tries to proxy-rate', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'regular@example.com' } },
    })

    const response = await POST(makeRequest({ email: 'target@example.com', recipeId: 'r1', value: 1 }))
    expect(response.status).toBe(403)
  })

  it('returns 400 when email is missing', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'admin1', email: 'tesscampbell30@gmail.com' } },
    })

    const response = await POST(makeRequest({ email: '', recipeId: 'r1', value: 1 }))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/email/i)
  })

  it('returns 400 when recipeId is missing', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'admin1', email: 'tesscampbell30@gmail.com' } },
    })

    const response = await POST(makeRequest({ email: 'target@example.com', recipeId: '', value: 1 }))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/recipe/i)
  })

  it('returns 400 when value is above max proxy rating (>2)', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'admin1', email: 'tesscampbell30@gmail.com' } },
    })

    // value 3 is not allowed for proxy rating (max 2)
    const response = await POST(makeRequest({ email: 'target@example.com', recipeId: 'r1', value: 3 }))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/0.*2|between/i)
  })

  it('returns 400 when value is negative', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'admin1', email: 'tesscampbell30@gmail.com' } },
    })

    const response = await POST(makeRequest({ email: 'target@example.com', recipeId: 'r1', value: -1 }))
    expect(response.status).toBe(400)
  })

  it('returns 400 when value is a non-integer', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'admin1', email: 'tesscampbell30@gmail.com' } },
    })

    const response = await POST(makeRequest({ email: 'target@example.com', recipeId: 'r1', value: 1.5 }))
    expect(response.status).toBe(400)
  })

  it('returns 404 when target user email is not found', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'admin1', email: 'tesscampbell30@gmail.com' } },
    })

    mockListUsers.mockResolvedValue({
      data: { users: [{ id: 'u1', email: 'existing@example.com' }] },
      error: null,
    })

    const response = await POST(makeRequest({ email: 'notfound@example.com', recipeId: 'r1', value: 1 }))
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toMatch(/notfound@example.com/)
  })

  it('returns 200 when admin successfully proxy-rates a user (value 0)', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'admin1', email: 'tesscampbell30@gmail.com' } },
    })

    mockListUsers.mockResolvedValue({
      data: { users: [{ id: 'target-u1', email: 'target@example.com' }] },
      error: null,
    })

    const savedRating = {
      id: 'rat1', recipe_id: 'r1', user_id: 'target-u1', rated_by_id: 'admin1', value: 0, created_at: '2024-01-01',
    }

    mockServiceFrom.mockReturnValue({
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: savedRating, error: null }),
    })

    const response = await POST(makeRequest({ email: 'target@example.com', recipeId: 'r1', value: 0 }))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.rating.user_id).toBe('target-u1')
    expect(body.rating.rated_by_id).toBe('admin1')
    expect(body.rating.value).toBe(0)
  })

  it('returns 200 when admin proxy-rates with value 2 (max proxy)', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'admin1', email: 'tesscampbell30@gmail.com' } },
    })

    mockListUsers.mockResolvedValue({
      data: { users: [{ id: 'target-u2', email: 'user2@example.com' }] },
      error: null,
    })

    const savedRating = {
      id: 'rat2', recipe_id: 'r1', user_id: 'target-u2', rated_by_id: 'admin1', value: 2, created_at: '2024-01-01',
    }

    mockServiceFrom.mockReturnValue({
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: savedRating, error: null }),
    })

    const response = await POST(makeRequest({ email: 'user2@example.com', recipeId: 'r1', value: 2 }))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.rating.value).toBe(2)
  })

  it('does case-insensitive email matching for target user lookup', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'admin2', email: 'corbyagain@gmail.com' } },
    })

    // Stored as lowercase, request uses uppercase
    mockListUsers.mockResolvedValue({
      data: { users: [{ id: 'target-u3', email: 'User3@Example.com' }] },
      error: null,
    })

    const savedRating = {
      id: 'rat3', recipe_id: 'r2', user_id: 'target-u3', rated_by_id: 'admin2', value: 1, created_at: '2024-01-01',
    }

    mockServiceFrom.mockReturnValue({
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: savedRating, error: null }),
    })

    const response = await POST(makeRequest({ email: 'user3@example.com', recipeId: 'r2', value: 1 }))
    expect(response.status).toBe(200)
  })
})
