/**
 * Component tests for RatingWidget
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RatingWidget from '@/components/RatingWidget'

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('RatingWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders three rating buttons (0, 1, 2)', () => {
    render(<RatingWidget recipeId="r1" initialValue={null} />)

    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.queryByText('3')).not.toBeInTheDocument()
  })

  it('renders rating labels for each button', () => {
    render(<RatingWidget recipeId="r1" initialValue={null} />)

    expect(screen.getByText('Not for me')).toBeInTheDocument()
    expect(screen.getByText('Good')).toBeInTheDocument()
    expect(screen.getByText('Great')).toBeInTheDocument()
  })

  it('shows no initial saved rating message when initialValue is null', () => {
    render(<RatingWidget recipeId="r1" initialValue={null} />)

    expect(screen.queryByText(/rating saved/i)).not.toBeInTheDocument()
  })

  it('shows saved rating message when initialValue is provided', () => {
    render(<RatingWidget recipeId="r1" initialValue={1} />)

    expect(screen.getByText(/rating saved: 1/i)).toBeInTheDocument()
  })

  it('shows saved rating with correct label for initialValue 0', () => {
    render(<RatingWidget recipeId="r1" initialValue={0} />)

    expect(screen.getByText(/not for me/i, { selector: 'p' })).toBeInTheDocument()
  })

  it('calls fetch with correct endpoint and value when rating is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rating: { value: 2 } }),
    })

    render(<RatingWidget recipeId="recipe-123" initialValue={null} />)
    fireEvent.click(screen.getByText('2'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/recipes/recipe-123/ratings',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: 2 }),
        })
      )
    })
  })

  it('updates selected rating after successful submission', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rating: { value: 1 } }),
    })

    render(<RatingWidget recipeId="r1" initialValue={null} />)
    fireEvent.click(screen.getByText('1'))

    await waitFor(() => {
      expect(screen.getByText(/rating saved: 1/i)).toBeInTheDocument()
    })
  })

  it('shows error message when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Unauthorized' }),
    })

    render(<RatingWidget recipeId="r1" initialValue={null} />)
    fireEvent.click(screen.getByText('0'))

    await waitFor(() => {
      expect(screen.getByText('Unauthorized')).toBeInTheDocument()
    })
  })

  it('shows generic error message when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<RatingWidget recipeId="r1" initialValue={null} />)
    fireEvent.click(screen.getByText('1'))

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('disables buttons while loading', async () => {
    let resolvePromise!: (val: unknown) => void
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => { resolvePromise = resolve })
    )

    render(<RatingWidget recipeId="r1" initialValue={null} />)
    fireEvent.click(screen.getByText('2'))

    // While loading, buttons should be disabled
    const buttons = screen.getAllByRole('button')
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled()
    })

    // Resolve and cleanup
    resolvePromise({ ok: true, json: async () => ({ rating: { value: 2 } }) })
    await waitFor(() => {
      expect(buttons[0]).not.toBeDisabled()
    })
  })
})
