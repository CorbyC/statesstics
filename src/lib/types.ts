export interface Tag {
  id: string
  name: string
  created_at: string
}

export interface Recipe {
  id: string
  title: string
  description: string
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface RecipeTag {
  recipe_id: string
  tag_id: string
}

export interface Rating {
  id: string
  recipe_id: string
  user_id: string
  rated_by_id: string
  value: number
  created_at: string
}

export interface RatingWithUser extends Rating {
  user_email: string
  rated_by_email: string
}

export interface RecipeWithDetails extends Recipe {
  tags: Tag[]
  avg_rating: number | null
  rating_count: number
}

export interface RecipeDetail extends Recipe {
  tags: Tag[]
  avg_rating: number | null
  rating_count: number
  ratings: RatingWithUser[]
}
