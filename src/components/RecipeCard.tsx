import Link from 'next/link'
import type { RecipeWithDetails } from '@/lib/types'

interface RecipeCardProps {
  recipe: RecipeWithDetails
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="block bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
    >
      {recipe.image_url && (
        <div className="aspect-video w-full overflow-hidden bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {recipe.title}
        </h2>
        <p className="text-sm text-gray-500 line-clamp-2 mb-4">
          {recipe.description}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {recipe.tags.map((tag) => (
              <span
                key={tag.id}
                className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium"
              >
                {tag.name}
              </span>
            ))}
          </div>
          <div className="text-sm text-gray-600 shrink-0 ml-4">
            {recipe.rating_count > 0 ? (
              <span>
                <span className="font-medium text-gray-900">
                  {recipe.avg_rating!.toFixed(1)}
                </span>
                <span className="text-gray-400"> / 3</span>
                <span className="text-gray-400 ml-1">
                  ({recipe.rating_count})
                </span>
              </span>
            ) : (
              <span className="text-gray-400 text-xs">No ratings yet</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
