/**
 * Tests for GET /api/recipes and POST /api/recipes
 */

// --- Mocks ---
const mockServiceFrom = jest.fn()
const mockServiceClient = {
  from: mockServiceFrom,
  auth: { admin: { listUsers: jest.fn() } },
}
jest.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: () => mockServiceClient,
}))

const mockServerGetUser = jest.fn()
const mockServerClient = {
  auth: { getUser: mockServerGetUser },
}
jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => mockServerClient,
}))

jest.mock('next/headers', () => ({
  cookies: () => ({ get: jest.fn(), set: jest.fn(), delete: jest.fn() }),
}))

// --- Helpers ---
function makeQueryBuilder(returnValue: unknown) {
  const builder: Record<string, jest.Mock> = {}
  const methods = ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'order', 'single', 'maybeSingle']
  for (const m of methods) {
    builder[m] = jest.fn(() => builder)
  }
  // The last call in chain resolves with returnValue
  builder['order'] = jest.fn(() => returnValue)
  builder['select'] = jest.fn(() => builder)
  builder['insert'] = jest.fn(() => builder)
  return builder
}

import { GET, POST } from '@/app/api/recipes/route'
import { NextRequest } from 'next/server'

// Helper to build a mock chain that resolves a value from the last call
function buildChain(finalData: unknown, finalError: unknown = null) {
  const chain: Record<string, jest.Mock> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single', 'maybeSingle', 'upsert']
  const resolved = Promise.resolve({ data: finalData, error: finalError })
  for (const m of methods) {
    chain[m] = jest.fn(() => chain)
  }
  // Make the chain thenable (await chain resolves to finalData/finalError)
  Object.assign(chain, resolved)
  return chain
}

describe('GET /api/recipes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 200 with an empty list when no recipes exist', async () => {
    let callCount = 0
    mockServiceFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // recipes query
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      if (callCount === 2) {
        // recipe_tags query
        return {
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      // ratings query
      return {
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual([])
  })

  it('returns 200 with recipes including tags and avg_rating', async () => {
    const recipes = [
      { id: 'r1', title: 'Pie', description: 'Tasty', image_url: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
    ]
    const recipeTags = [
      { recipe_id: 'r1', tags: { id: 't1', name: 'Dessert', created_at: '2024-01-01' } },
    ]
    const ratings = [
      { recipe_id: 'r1', value: 2 },
      { recipe_id: 'r1', value: 1 },
    ]

    let callCount = 0
    mockServiceFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: recipes, error: null }),
        }
      }
      if (callCount === 2) {
        return {
          select: jest.fn().mockResolvedValue({ data: recipeTags, error: null }),
        }
      }
      return {
        select: jest.fn().mockResolvedValue({ data: ratings, error: null }),
      }
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveLength(1)
    expect(body[0].title).toBe('Pie')
    expect(body[0].tags).toHaveLength(1)
    expect(body[0].tags[0].name).toBe('Dessert')
    expect(body[0].avg_rating).toBe(1.5) // (2+1)/2
    expect(body[0].rating_count).toBe(2)
  })

  it('returns null avg_rating when recipe has no ratings', async () => {
    const recipes = [
      { id: 'r2', title: 'Soup', description: 'Warm', image_url: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
    ]

    let callCount = 0
    mockServiceFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: recipes, error: null }),
        }
      }
      if (callCount === 2) {
        return {
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      return {
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
    })

    const response = await GET()
    const body = await response.json()

    expect(body[0].avg_rating).toBeNull()
    expect(body[0].rating_count).toBe(0)
  })

  it('returns 500 if db throws an error', async () => {
    mockServiceFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: { message: 'db error' } }),
    }))

    const response = await GET()
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Failed to fetch recipes')
  })
})

describe('POST /api/recipes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  function makeRequest(body: object) {
    return new NextRequest('http://localhost/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  it('returns 401 if user is not authenticated', async () => {
    mockServerGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const req = makeRequest({ title: 'Test', description: 'Desc', tag_ids: ['t1'] })
    const response = await POST(req)
    expect(response.status).toBe(401)
  })

  it('returns 403 if user is not an admin', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'regular@example.com' } },
    })

    const req = makeRequest({ title: 'Test', description: 'Desc', tag_ids: ['t1'] })
    const response = await POST(req)
    expect(response.status).toBe(403)
  })

  it('returns 400 if title is missing', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'tesscampbell30@gmail.com' } },
    })

    const req = makeRequest({ title: '', description: 'Desc', tag_ids: ['t1'] })
    const response = await POST(req)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/title/i)
  })

  it('returns 400 if description is missing', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'tesscampbell30@gmail.com' } },
    })

    const req = makeRequest({ title: 'Test', description: '', tag_ids: ['t1'] })
    const response = await POST(req)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/description/i)
  })

  it('returns 400 if no tags are provided', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'tesscampbell30@gmail.com' } },
    })

    const req = makeRequest({ title: 'Test', description: 'Desc', tag_ids: [] })
    const response = await POST(req)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/tag/i)
  })

  it('returns 201 when admin creates a recipe successfully', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'admin1', email: 'tesscampbell30@gmail.com' } },
    })

    const createdRecipe = {
      id: 'r1', title: 'Cake', description: 'Delicious', image_url: null,
      created_at: '2024-01-01', updated_at: '2024-01-01',
    }

    let callCount = 0
    mockServiceFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // insert recipe
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: createdRecipe, error: null }),
        }
      }
      // insert recipe_tags
      return {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
    })

    const req = makeRequest({ title: 'Cake', description: 'Delicious', tag_ids: ['t1'] })
    const response = await POST(req)
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.title).toBe('Cake')
  })

  it('returns 201 for the second admin email too', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'admin2', email: 'corbyagain@gmail.com' } },
    })

    const createdRecipe = {
      id: 'r2', title: 'Soup', description: 'Warm soup', image_url: null,
      created_at: '2024-01-01', updated_at: '2024-01-01',
    }

    let callCount = 0
    mockServiceFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: createdRecipe, error: null }),
        }
      }
      return {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
    })

    const req = makeRequest({ title: 'Soup', description: 'Warm soup', tag_ids: ['t2'] })
    const response = await POST(req)
    expect(response.status).toBe(201)
  })
})
