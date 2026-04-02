/**
 * Component tests for RecipeCard
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import RecipeCard from '@/components/RecipeCard'
import type { RecipeWithDetails } from '@/lib/types'

// Mock Next.js Link
jest.mock('next/link', () => {
  const Link = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  )
  Link.displayName = 'Link'
  return Link
})

const baseRecipe: RecipeWithDetails = {
  id: 'r1',
  title: 'Chocolate Cake',
  description: 'A delicious chocolate cake recipe with layers of fudge frosting.',
  image_url: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  tags: [
    { id: 't1', name: 'Dessert', created_at: '2024-01-01T00:00:00Z' },
  ],
  avg_rating: null,
  rating_count: 0,
}

describe('RecipeCard', () => {
  it('renders the recipe title', () => {
    render(<RecipeCard recipe={baseRecipe} />)
    expect(screen.getByText('Chocolate Cake')).toBeInTheDocument()
  })

  it('renders the recipe description', () => {
    render(<RecipeCard recipe={baseRecipe} />)
    expect(screen.getByText(/delicious chocolate cake/i)).toBeInTheDocument()
  })

  it('renders tag badges', () => {
    render(<RecipeCard recipe={baseRecipe} />)
    expect(screen.getByText('Dessert')).toBeInTheDocument()
  })

  it('renders multiple tags when present', () => {
    const recipe: RecipeWithDetails = {
      ...baseRecipe,
      tags: [
        { id: 't1', name: 'Dessert', created_at: '2024-01-01T00:00:00Z' },
        { id: 't2', name: 'Entree', created_at: '2024-01-01T00:00:00Z' },
      ],
    }
    render(<RecipeCard recipe={recipe} />)
    expect(screen.getByText('Dessert')).toBeInTheDocument()
    expect(screen.getByText('Entree')).toBeInTheDocument()
  })

  it('links to the recipe detail page', () => {
    render(<RecipeCard recipe={baseRecipe} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/recipes/r1')
  })

  it('shows "No ratings yet" when rating_count is 0', () => {
    render(<RecipeCard recipe={baseRecipe} />)
    expect(screen.getByText(/no ratings yet/i)).toBeInTheDocument()
  })

  it('shows average rating when rating_count > 0', () => {
    const recipe: RecipeWithDetails = {
      ...baseRecipe,
      avg_rating: 1.5,
      rating_count: 4,
    }
    render(<RecipeCard recipe={recipe} />)
    expect(screen.getByText('1.5')).toBeInTheDocument()
    expect(screen.getByText('(4)')).toBeInTheDocument()
  })

  it('does not render image element when image_url is null', () => {
    render(<RecipeCard recipe={baseRecipe} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('renders image when image_url is provided', () => {
    const recipe: RecipeWithDetails = {
      ...baseRecipe,
      image_url: 'https://example.com/cake.jpg',
    }
    render(<RecipeCard recipe={recipe} />)
    const img = screen.getByRole('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/cake.jpg')
    expect(img).toHaveAttribute('alt', 'Chocolate Cake')
  })

  it('shows rating formatted to 1 decimal place', () => {
    const recipe: RecipeWithDetails = {
      ...baseRecipe,
      avg_rating: 2,
      rating_count: 1,
    }
    render(<RecipeCard recipe={recipe} />)
    expect(screen.getByText('2.0')).toBeInTheDocument()
  })
})
