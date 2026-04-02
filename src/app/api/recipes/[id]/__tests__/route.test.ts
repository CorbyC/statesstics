/**
 * Tests for GET/PATCH/DELETE /api/recipes/[id]
 */

const mockServiceFrom = jest.fn()
const mockServiceClient = {
  from: mockServiceFrom,
  auth: { admin: { listUsers: jest.fn() } },
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

import { GET, PATCH, DELETE } from '@/app/api/recipes/[id]/route'
import { NextRequest } from 'next/server'

const params = { id: 'recipe-uuid-1' }

describe('GET /api/recipes/[id]', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 404 when recipe does not exist', async () => {
    let callCount = 0
    mockServiceFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
        }
      }
      return {}
    })

    const req = new NextRequest('http://localhost/api/recipes/recipe-uuid-1')
    const response = await GET(req, { params })
    expect(response.status).toBe(404)
  })

  it('returns 200 with recipe details including tags and ratings', async () => {
    const recipe = { id: 'recipe-uuid-1', title: 'Pie', description: 'Nice', image_url: null, created_at: '2024-01-01', updated_at: '2024-01-01' }
    const recipeTags = [{ tags: { id: 't1', name: 'Dessert', created_at: '2024-01-01' } }]
    const ratings = [{ id: 'rat1', recipe_id: 'recipe-uuid-1', user_id: 'u1', rated_by_id: 'u1', value: 2, created_at: '2024-01-01' }]

    mockServiceClient.auth.admin.listUsers = jest.fn().mockResolvedValue({
      data: { users: [{ id: 'u1', email: 'user@example.com' }] },
    })

    let callCount = 0
    mockServiceFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // recipe fetch
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: recipe, error: null }),
        }
      }
      if (callCount === 2) {
        // recipe_tags fetch
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: recipeTags, error: null }),
        }
      }
      // ratings fetch
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: ratings, error: null }),
      }
    })

    const req = new NextRequest('http://localhost/api/recipes/recipe-uuid-1')
    const response = await GET(req, { params })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.title).toBe('Pie')
    expect(body.tags).toHaveLength(1)
    expect(body.ratings).toHaveLength(1)
    expect(body.ratings[0].user_email).toBe('user@example.com')
    expect(body.avg_rating).toBe(2)
    expect(body.rating_count).toBe(1)
  })

  it('shows null avg_rating when recipe has no ratings', async () => {
    const recipe = { id: 'recipe-uuid-1', title: 'Empty', description: 'No ratings yet', image_url: null, created_at: '2024-01-01', updated_at: '2024-01-01' }

    mockServiceClient.auth.admin.listUsers = jest.fn().mockResolvedValue({ data: { users: [] } })

    let callCount = 0
    mockServiceFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: recipe, error: null }),
        }
      }
      if (callCount === 2) {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
    })

    const req = new NextRequest('http://localhost/api/recipes/recipe-uuid-1')
    const response = await GET(req, { params })
    const body = await response.json()
    expect(body.avg_rating).toBeNull()
  })
})

describe('PATCH /api/recipes/[id]', () => {
  beforeEach(() => jest.clearAllMocks())

  function makeRequest(body: object) {
    return new NextRequest(`http://localhost/api/recipes/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  it('returns 401 when unauthenticated', async () => {
    mockServerGetUser.mockResolvedValue({ data: { user: null } })
    const response = await PATCH(makeRequest({ title: 'New' }), { params })
    expect(response.status).toBe(401)
  })

  it('returns 403 when non-admin tries to update', async () => {
    mockServerGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'user@example.com' } } })
    const response = await PATCH(makeRequest({ title: 'New' }), { params })
    expect(response.status).toBe(403)
  })

  it('returns 400 when updating with empty tag_ids array', async () => {
    mockServerGetUser.mockResolvedValue({ data: { user: { id: 'admin', email: 'tesscampbell30@gmail.com' } } })

    // No actual DB calls should happen before the tag validation
    const response = await PATCH(makeRequest({ tag_ids: [] }), { params })
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/tag/i)
  })

  it('returns 200 when admin updates a recipe title', async () => {
    mockServerGetUser.mockResolvedValue({ data: { user: { id: 'admin', email: 'tesscampbell30@gmail.com' } } })

    const updatedRecipe = { id: params.id, title: 'Updated', description: 'Desc', image_url: null, created_at: '2024-01-01', updated_at: '2024-01-02' }

    let callCount = 0
    mockServiceFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // update
        return {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      // fetch updated
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: updatedRecipe, error: null }),
      }
    })

    const response = await PATCH(makeRequest({ title: 'Updated' }), { params })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.title).toBe('Updated')
  })
})

describe('DELETE /api/recipes/[id]', () => {
  beforeEach(() => jest.clearAllMocks())

  function makeRequest() {
    return new NextRequest(`http://localhost/api/recipes/${params.id}`, { method: 'DELETE' })
  }

  it('returns 401 when unauthenticated', async () => {
    mockServerGetUser.mockResolvedValue({ data: { user: null } })
    const response = await DELETE(makeRequest(), { params })
    expect(response.status).toBe(401)
  })

  it('returns 403 when non-admin tries to delete', async () => {
    mockServerGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'user@example.com' } } })
    const response = await DELETE(makeRequest(), { params })
    expect(response.status).toBe(403)
  })

  it('returns 200 when admin deletes a recipe', async () => {
    mockServerGetUser.mockResolvedValue({ data: { user: { id: 'admin', email: 'corbyagain@gmail.com' } } })

    mockServiceFrom.mockImplementation(() => ({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    }))

    const response = await DELETE(makeRequest(), { params })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
  })
})
