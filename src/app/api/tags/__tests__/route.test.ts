/**
 * Tests for GET /api/tags and POST /api/tags
 */

const mockServiceFrom = jest.fn()
const mockServiceClient = {
  from: mockServiceFrom,
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

import { GET, POST } from '@/app/api/tags/route'
import { NextRequest } from 'next/server'

describe('GET /api/tags', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 200 with empty array when no tags exist', async () => {
    mockServiceFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual([])
  })

  it('returns 200 with list of tags ordered by name', async () => {
    const tags = [
      { id: 't1', name: 'Dessert', created_at: '2024-01-01' },
      { id: 't2', name: 'Entree', created_at: '2024-01-01' },
      { id: 't3', name: 'Side', created_at: '2024-01-01' },
    ]

    mockServiceFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: tags, error: null }),
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveLength(3)
    expect(body[0].name).toBe('Dessert')
  })

  it('returns 500 when database errors', async () => {
    mockServiceFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: { message: 'db error' } }),
    })

    const response = await GET()
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Failed to fetch tags')
  })
})

describe('POST /api/tags', () => {
  beforeEach(() => jest.clearAllMocks())

  function makeRequest(body: object) {
    return new NextRequest('http://localhost/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  it('returns 401 when user is not authenticated', async () => {
    mockServerGetUser.mockResolvedValue({ data: { user: null } })

    const response = await POST(makeRequest({ name: 'Breakfast' }))
    expect(response.status).toBe(401)
  })

  it('returns 403 when non-admin tries to create a tag', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'regular@example.com' } },
    })

    const response = await POST(makeRequest({ name: 'Breakfast' }))
    expect(response.status).toBe(403)
  })

  it('returns 400 when tag name is empty', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'admin1', email: 'tesscampbell30@gmail.com' } },
    })

    const response = await POST(makeRequest({ name: '' }))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/name/i)
  })

  it('returns 400 when tag name is only whitespace', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'admin1', email: 'tesscampbell30@gmail.com' } },
    })

    const response = await POST(makeRequest({ name: '   ' }))
    expect(response.status).toBe(400)
  })

  it('returns 201 when admin creates a tag successfully', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'admin1', email: 'tesscampbell30@gmail.com' } },
    })

    const newTag = { id: 't4', name: 'Breakfast', created_at: '2024-01-01' }

    mockServiceFrom.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: newTag, error: null }),
    })

    const response = await POST(makeRequest({ name: 'Breakfast' }))
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.name).toBe('Breakfast')
  })

  it('returns 201 for the second admin email', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'admin2', email: 'corbyagain@gmail.com' } },
    })

    const newTag = { id: 't5', name: 'Lunch', created_at: '2024-01-01' }

    mockServiceFrom.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: newTag, error: null }),
    })

    const response = await POST(makeRequest({ name: 'Lunch' }))
    expect(response.status).toBe(201)
  })

  it('returns 409 when tag name already exists (unique constraint)', async () => {
    mockServerGetUser.mockResolvedValue({
      data: { user: { id: 'admin1', email: 'tesscampbell30@gmail.com' } },
    })

    mockServiceFrom.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: '23505', message: 'unique violation' } }),
    })

    const response = await POST(makeRequest({ name: 'Dessert' }))
    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body.error).toMatch(/already exists/i)
  })
})
