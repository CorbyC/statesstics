-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz default now()
);

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists recipe_tags (
  recipe_id uuid not null references recipes(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (recipe_id, tag_id)
);

create table if not exists ratings (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rated_by_id uuid not null references auth.users(id) on delete cascade,
  value smallint not null check (value >= 0 and value <= 3),
  created_at timestamptz default now(),
  unique (recipe_id, user_id)
);

-- ============================================================
-- UPDATED_AT TRIGGER FOR RECIPES
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger recipes_updated_at
  before update on recipes
  for each row execute function update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table tags enable row level security;
alter table recipes enable row level security;
alter table recipe_tags enable row level security;
alter table ratings enable row level security;

-- Tags: authenticated users can read; writes handled by service role
create policy "tags_select_authenticated"
  on tags for select
  to authenticated
  using (true);

-- Recipes: authenticated users can read; writes handled by service role
create policy "recipes_select_authenticated"
  on recipes for select
  to authenticated
  using (true);

-- Recipe tags: authenticated users can read
create policy "recipe_tags_select_authenticated"
  on recipe_tags for select
  to authenticated
  using (true);

-- Ratings: users can see their own ratings (as rater or rated user)
create policy "ratings_select_own"
  on ratings for select
  to authenticated
  using (user_id = auth.uid() or rated_by_id = auth.uid());

-- ============================================================
-- SEED DATA
-- ============================================================

insert into tags (name) values
  ('Dessert'),
  ('Entree'),
  ('Side')
on conflict (name) do nothing;
