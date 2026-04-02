/**
 * Tests for GET /api/recipes/[id]/ratings and POST /api/recipes/[id]/ratings
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

import { GET, POST } from '@/app/api/recipes/[id]/ratings/route'
import { NextRequest } from 'next/server'

const params = { id: 'recipe-uuid-1' }

describe('GET /api/recipes/[id]/ratings', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when user is not authenticated', async () => {
    mockServerGetUser.mockResolvedValue({ data: { user: null } })

    const req = new NextRequest(`http://localhost/api/recipes/${params.id}/ratings`)
    const response = await GET(req, { params })
    expect(response.status).toBe(401)
  })

  it('returns 200 with null rating when user has not rated', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'user@example.com' } },
    })

    mockServiceFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })

    const req = new NextRequest(`http://localhost/api/recipes/${params.id}/ratings`)
    const response = await GET(req, { params })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.rating).toBeNull()
  })

  it('returns 200 with existing rating when user has rated', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'user@example.com' } },
    })

    const existingRating = {
      id: 'rat1', recipe_id: params.id, user_id: 'u1', rated_by_id: 'u1', value: 2, created_at: '2024-01-01',
    }

    mockServiceFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: existingRating, error: null }),
    })

    const req = new NextRequest(`http://localhost/api/recipes/${params.id}/ratings`)
    const response = await GET(req, { params })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.rating).toEqual(existingRating)
    expect(body.rating.value).toBe(2)
  })
})

describe('POST /api/recipes/[id]/ratings', () => {
  beforeEach(() => jest.clearAllMocks())

  function makeRequest(body: object) {
    return new NextRequest(`http://localhost/api/recipes/${params.id}/ratings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  it('returns 401 when user is not authenticated', async () => {
    mockServerGetUser.mockResolvedValue({ data: { user: null } })

    const response = await POST(makeRequest({ value: 1 }), { params })
    expect(response.status).toBe(401)
  })

  it('returns 400 when value is not provided', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'user@example.com' } },
    })

    const response = await POST(makeRequest({}), { params })
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/value/i)
  })

  it('returns 400 when non-admin submits rating greater than 2', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'regular@example.com' } },
    })

    const response = await POST(makeRequest({ value: 3 }), { params })
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/0.*2|between/i)
  })

  it('returns 400 when non-admin submits negative rating', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'regular@example.com' } },
    })

    const response = await POST(makeRequest({ value: -1 }), { params })
    expect(response.status).toBe(400)
  })

  it('returns 400 when rating value is not an integer', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'regular@example.com' } },
    })

    const response = await POST(makeRequest({ value: 1.5 }), { params })
    expect(response.status).toBe(400)
  })

  it('returns 200 when non-admin submits valid rating of 0', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'regular@example.com' } },
    })

    const savedRating = { id: 'rat1', recipe_id: params.id, user_id: 'u1', rated_by_id: 'u1', value: 0, created_at: '2024-01-01' }

    mockServiceFrom.mockReturnValue({
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: savedRating, error: null }),
    })

    const response = await POST(makeRequest({ value: 0 }), { params })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.rating.value).toBe(0)
  })

  it('returns 200 when non-admin submits valid rating of 2', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'regular@example.com' } },
    })

    const savedRating = { id: 'rat2', recipe_id: params.id, user_id: 'u1', rated_by_id: 'u1', value: 2, created_at: '2024-01-01' }

    mockServiceFrom.mockReturnValue({
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: savedRating, error: null }),
    })

    const response = await POST(makeRequest({ value: 2 }), { params })
    expect(response.status).toBe(200)
  })

  it('returns 200 when admin submits rating of 3 (admin-exclusive)', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'admin1', email: 'tesscampbell30@gmail.com' } },
    })

    const savedRating = { id: 'rat3', recipe_id: params.id, user_id: 'admin1', rated_by_id: 'admin1', value: 3, created_at: '2024-01-01' }

    mockServiceFrom.mockReturnValue({
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: savedRating, error: null }),
    })

    const response = await POST(makeRequest({ value: 3 }), { params })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.rating.value).toBe(3)
  })

  it('returns 400 when even admin submits rating greater than 3', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'admin1', email: 'tesscampbell30@gmail.com' } },
    })

    const response = await POST(makeRequest({ value: 4 }), { params })
    expect(response.status).toBe(400)
  })

  it('returns 200 when admin (second email) submits rating of 3', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'admin2', email: 'corbyagain@gmail.com' } },
    })

    const savedRating = { id: 'rat4', recipe_id: params.id, user_id: 'admin2', rated_by_id: 'admin2', value: 3, created_at: '2024-01-01' }

    mockServiceFrom.mockReturnValue({
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: savedRating, error: null }),
    })

    const response = await POST(makeRequest({ value: 3 }), { params })
    expect(response.status).toBe(200)
  })
})
