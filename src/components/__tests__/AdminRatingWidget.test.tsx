/**
 * Component tests for AdminRatingWidget
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminRatingWidget from '@/components/AdminRatingWidget'

const mockFetch = jest.fn()
global.fetch = mockFetch

describe('AdminRatingWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders four rating buttons (0, 1, 2, 3)', () => {
    render(<AdminRatingWidget recipeId="r1" initialValue={null} />)

    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders the "Amazing" label for rating 3 (admin-exclusive)', () => {
    render(<AdminRatingWidget recipeId="r1" initialValue={null} />)

    expect(screen.getByText('Amazing')).toBeInTheDocument()
  })

  it('shows admin indicator text in heading', () => {
    render(<AdminRatingWidget recipeId="r1" initialValue={null} />)

    expect(screen.getByText(/Admin/i)).toBeInTheDocument()
    expect(screen.getByText(/0–3/)).toBeInTheDocument()
  })

  it('shows no saved rating message when initialValue is null', () => {
    render(<AdminRatingWidget recipeId="r1" initialValue={null} />)

    expect(screen.queryByText(/rating saved/i)).not.toBeInTheDocument()
  })

  it('shows saved rating message when initialValue is 3', () => {
    render(<AdminRatingWidget recipeId="r1" initialValue={3} />)

    expect(screen.getByText(/rating saved: 3/i)).toBeInTheDocument()
    expect(screen.getByText(/Amazing/i, { selector: 'p' })).toBeInTheDocument()
  })

  it('calls fetch with value 3 when Amazing button is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rating: { value: 3 } }),
    })

    render(<AdminRatingWidget recipeId="recipe-xyz" initialValue={null} />)
    fireEvent.click(screen.getByText('3'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/recipes/recipe-xyz/ratings',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ value: 3 }),
        })
      )
    })
  })

  it('updates selected rating to 3 after successful submission', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rating: { value: 3 } }),
    })

    render(<AdminRatingWidget recipeId="r1" initialValue={null} />)
    fireEvent.click(screen.getByText('3'))

    await waitFor(() => {
      expect(screen.getByText(/rating saved: 3/i)).toBeInTheDocument()
    })
  })

  it('shows error message when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Forbidden' }),
    })

    render(<AdminRatingWidget recipeId="r1" initialValue={null} />)
    fireEvent.click(screen.getByText('1'))

    await waitFor(() => {
      expect(screen.getByText('Forbidden')).toBeInTheDocument()
    })
  })

  it('disables all buttons while loading', async () => {
    let resolvePromise!: (val: unknown) => void
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => { resolvePromise = resolve })
    )

    render(<AdminRatingWidget recipeId="r1" initialValue={null} />)
    fireEvent.click(screen.getByText('3'))

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(4)
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled()
    })

    resolvePromise({ ok: true, json: async () => ({ rating: { value: 3 } }) })
    await waitFor(() => {
      expect(buttons[0]).not.toBeDisabled()
    })
  })
})
