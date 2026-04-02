# LIN-5 — Statesstics

## Spec
_2026-04-02T01:30:00Z_

### Problem Statement
Tess and Corby want a recipe rating web app called "Statesstics" where users can log in with Google (Gmail) auth and rate recipes on a 0–2 scale. The two named admins need elevated capabilities: they can manage the recipe catalog (add/remove recipes and tags) and can rate on behalf of other users. There is no existing solution, so everything needs to be built from scratch.

### Proposed Solution
A Next.js web app with Google OAuth login (via Supabase Auth). After logging in, users see a list of recipes they can browse and rate (0, 1, or 2). Admins (hardcoded emails: tesscampbell30@gmail.com and corbyagain@gmail.com) see additional controls:

- A recipe management UI to create, edit, and delete recipes (title, long description, optional image, one or more tags).
- A tag management UI to add or remove tags (starting tags: Dessert, Entree, Side).
- The ability to rate any recipe as 0, 1, 2, or 3 (the admin-exclusive rating value).
- The ability to add a registered user by email and submit a rating on that user's behalf.

Non-admin users can only log in, browse recipes, and submit their own ratings (0, 1, or 2).

### Acceptance Criteria
1. A user can sign in using their Google account via the app's login page.
2. A signed-in non-admin user can view all recipes in the catalog.
3. A signed-in non-admin user can submit a rating of 0, 1, or 2 on any recipe; the rating is saved and reflected in the UI.
4. A non-admin user cannot access admin-only controls (recipe management, tag management, proxy rating).
5. Signing in with tesscampbell30@gmail.com grants admin privileges; signing in with corbyagain@gmail.com also grants admin privileges; any other email does not.
6. An admin can create a new recipe with a title, long description, at least one tag, and an optional picture upload.
7. An admin can delete an existing recipe from the catalog.
8. An admin can add a new tag and remove an existing tag; the starting tags (Dessert, Entree, Side) exist on first run.
9. Each recipe requires at least one tag; the system prevents saving a recipe with zero tags.
10. An admin can rate a recipe 0, 1, 2, or 3; a non-admin cannot submit a rating of 3.
11. An admin can add a user by email address and submit a rating (0–2) on that user's behalf; that rating is stored attributed to the specified user.
12. A user's rating for a recipe is visible to that user when they view the recipe.

### Out of Scope
- Self-service admin promotion (no UI to grant or revoke admin status).
- Social features (comments, sharing, following other users).
- Recipe search or advanced filtering beyond tags.
- Email notifications of any kind.
- Mobile native apps (web only).
- Pagination or infinite scroll (can be deferred to a later ticket).

### Open Questions
- Should an admin-on-behalf rating count the same as the target user's own rating, or be stored separately (e.g., to allow the user to also submit their own rating later)?
- Should recipes display an aggregate/average rating, and if so, should proxy ratings (admin-on-behalf) be included in the aggregate?
- Is there a maximum image size or accepted file type for recipe pictures?
- Should non-logged-in visitors be able to browse recipes (read-only), or is login required to view anything?

## Architecture Decision
_2026-04-02T02:00:00Z_

### Approach

**Next.js 14 App Router + Supabase (Auth, PostgreSQL, Storage)**

The app is a full-stack Next.js application using the App Router. Supabase handles three concerns simultaneously: Google OAuth (Supabase Auth), relational data (Postgres), and image uploads (Supabase Storage). No separate backend service is needed.

**Authentication**: Supabase Auth with the Google OAuth provider. After sign-in, Supabase sets a session cookie read by `@supabase/ssr`. A Next.js middleware file protects every route except `/login` and the OAuth callback. Admin status is determined by comparing the signed-in user's email against a hardcoded `ADMIN_EMAILS` constant (`tesscampbell30@gmail.com`, `corbyagain@gmail.com`) — no admin table required.

**Data model**:
- `tags(id, name, created_at)` — seeded with Dessert, Entree, Side via migration
- `recipes(id, title, description, image_url, created_at, updated_at)`
- `recipe_tags(recipe_id, tag_id)` — many-to-many junction
- `ratings(id, recipe_id, user_id, rated_by_id, value, created_at)` — UNIQUE on (recipe_id, user_id); `user_id` is the rated user, `rated_by_id` is who submitted (same for self-rating, admin email for proxy)

**Rating rules** enforced in API Route Handlers (server-side): non-admins may only submit 0–2; admins may submit 0–3. Proxy rating (admin rates on behalf) sets `user_id` to the looked-up target user, `rated_by_id` to the admin. Upsert on (recipe_id, user_id) means a user always has at most one rating per recipe.

**Aggregate display**: recipe list card shows average of all ratings for that recipe; recipe detail page shows average plus individual per-user ratings (name + value).

**Image uploads**: client POSTs the file to `/api/upload`; the Route Handler resizes images > 10 MB server-side with `sharp`, then uploads to a public Supabase Storage bucket (`recipe-images`). The resulting public URL is stored in `recipes.image_url`.

**Row-Level Security**: enabled on all tables. `ratings` SELECT policy: users see only rows where `user_id = auth.uid()`; service-role key (used in API routes) bypasses RLS for admin operations and aggregate reads.

**Routing structure**:
- `/login` — Google sign-in
- `/recipes` — authenticated recipe list (home redirect)
- `/recipes/[id]` — recipe detail + user's own rating widget
- `/admin` — admin dashboard
- `/admin/recipes/new` — create recipe
- `/admin/recipes/[id]/edit` — edit recipe
- `/admin/tags` — tag management
- `/admin/ratings` — proxy rating tool

### Alternatives Considered
- **NextAuth.js for Google OAuth**: Rejected because Supabase Auth is already provisioned and covers the same OAuth flow with less configuration overhead; keeping auth inside Supabase also lets RLS policies reference `auth.uid()` natively.
- **Separate Express/Node API server**: Rejected because Next.js Route Handlers provide equivalent server-side logic without a second deployment target, keeping the project to a single repo and Vercel deployment.
- **Storing admin emails in the database**: Rejected because the spec explicitly calls for hardcoded admin accounts with no self-service promotion; a constant is simpler and removes a whole class of privilege-escalation risk.

### Constraints
- Google OAuth redirect URI must be configured in Google Cloud Console to match the Vercel deployment URL and `localhost:3000`.
- Supabase Storage bucket `recipe-images` must be set to public reads so image URLs work without auth tokens.
- Service-role key (`SUPABASE_SERVICE_ROLE_KEY`) must never be exposed to the browser; only used in Route Handlers and server components.
- `sharp` requires a native binary; Vercel's Node.js runtime supports it but the package must be listed in `dependencies` (not `devDependencies`).
- Rating value 3 is admin-exclusive and must be enforced server-side; the client widget simply does not render it for non-admins, but the API also validates.

### Files Affected

**Config / scaffolding**
- `package.json` — new, Next.js 14 project manifest with all dependencies
- `next.config.ts` — new, enables Supabase image hostname for `next/image`
- `tsconfig.json` — new, TypeScript config
- `tailwind.config.ts` — new, Tailwind configuration
- `postcss.config.mjs` — new, PostCSS config for Tailwind
- `.gitignore` — new, standard Next.js gitignore

**Database**
- `supabase/migrations/001_initial_schema.sql` — new, creates all tables, RLS policies, seed data (Dessert/Entree/Side tags)

**Library / shared**
- `src/lib/supabase/client.ts` — new, browser-side Supabase client (anon key)
- `src/lib/supabase/server.ts` — new, server-side Supabase client using `@supabase/ssr` cookie store
- `src/lib/constants.ts` — new, `ADMIN_EMAILS` array and other app-wide constants
- `src/lib/types.ts` — new, TypeScript interfaces: `Recipe`, `Tag`, `Rating`, `User`
- `src/middleware.ts` — new, protects all routes except `/login` and `/api/auth/callback`

**Auth**
- `src/app/layout.tsx` — new, root layout wrapping `<NavBar>` and children
- `src/app/page.tsx` — new, redirects authenticated users to `/recipes`, unauthenticated to `/login`
- `src/app/login/page.tsx` — new, renders Google sign-in button via Supabase Auth UI
- `src/app/api/auth/callback/route.ts` — new, handles Supabase OAuth code exchange

**Components (shared)**
- `src/components/NavBar.tsx` — new, top nav with app name, user email, sign-out button, admin links
- `src/components/RecipeCard.tsx` — new, card showing title, tags, average rating
- `src/components/RatingWidget.tsx` — new, 0–2 star/button widget for non-admin users
- `src/components/AdminRatingWidget.tsx` — new, 0–3 rating widget for admins
- `src/components/RecipeForm.tsx` — new, create/edit form (title, description, tags, image upload)
- `src/components/TagManager.tsx` — new, list of tags with delete button + add-tag input
- `src/components/ProxyRatingForm.tsx` — new, email input + recipe selector + rating for admin proxy

**API routes**
- `src/app/api/recipes/route.ts` — new, GET (list all with avg rating), POST (create, admin only)
- `src/app/api/recipes/[id]/route.ts` — new, GET (detail + ratings), DELETE (admin only)
- `src/app/api/recipes/[id]/ratings/route.ts` — new, GET (caller's rating), POST (upsert rating, enforce 0–2 for non-admin)
- `src/app/api/tags/route.ts` — new, GET (list), POST (create, admin only)
- `src/app/api/tags/[id]/route.ts` — new, DELETE (admin only)
- `src/app/api/upload/route.ts` — new, POST (resize with sharp if needed, upload to Supabase Storage)
- `src/app/api/admin/proxy-rating/route.ts` — new, POST (look up user by email, upsert rating on their behalf, admin only)

**Pages (user-facing)**
- `src/app/recipes/page.tsx` — new, fetches recipe list, renders `<RecipeCard>` grid
- `src/app/recipes/[id]/page.tsx` — new, fetches recipe detail + individual ratings, renders `<RatingWidget>` or `<AdminRatingWidget>`

**Pages (admin)**
- `src/app/admin/page.tsx` — new, admin dashboard with links to sub-sections and recipe list with delete buttons
- `src/app/admin/recipes/new/page.tsx` — new, renders `<RecipeForm>` for creation
- `src/app/admin/recipes/[id]/edit/page.tsx` — new, renders `<RecipeForm>` pre-filled for editing
- `src/app/admin/tags/page.tsx` — new, renders `<TagManager>`
- `src/app/admin/ratings/page.tsx` — new, renders `<ProxyRatingForm>`

### Dependencies
- `next` — Next.js framework (App Router)
- `react`, `react-dom` — React runtime
- `typescript` — TypeScript compiler
- `tailwindcss`, `postcss`, `autoprefixer` — CSS utility framework
- `@supabase/supabase-js` — Supabase JS client (auth, DB, storage)
- `@supabase/ssr` — Supabase SSR helpers for cookie-based sessions in Next.js
- `sharp` — Server-side image resizing for uploads > 10 MB

### Subtasks

1. **Project scaffolding**: Initialise the Next.js 14 project with TypeScript and Tailwind CSS. Creates/modifies: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `.gitignore`.

2. **Database schema**: Write and apply the Supabase migration that creates all tables (tags, recipes, recipe_tags, ratings), RLS policies, and the three seed tags. Creates: `supabase/migrations/001_initial_schema.sql`.

3. **Supabase clients, types, and constants**: Set up shared library files and middleware so every subsequent subtask can import from them. Creates: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/constants.ts`, `src/lib/types.ts`, `src/middleware.ts`.

4. **Auth flow**: Build the login page, OAuth callback route, root redirect, and NavBar. Creates: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/api/auth/callback/route.ts`, `src/components/NavBar.tsx`.

5. **Recipe and Tag API routes**: Implement all server-side Route Handlers for recipe and tag CRUD plus image upload. Creates: `src/app/api/recipes/route.ts`, `src/app/api/recipes/[id]/route.ts`, `src/app/api/tags/route.ts`, `src/app/api/tags/[id]/route.ts`, `src/app/api/upload/route.ts`.

6. **Ratings API routes**: Implement rating submission (user self-rating) and admin proxy-rating Route Handlers. Creates: `src/app/api/recipes/[id]/ratings/route.ts`, `src/app/api/admin/proxy-rating/route.ts`.

7. **User-facing recipe pages and components**: Build the recipe list, recipe detail page, and rating widgets. Creates: `src/app/recipes/page.tsx`, `src/app/recipes/[id]/page.tsx`, `src/components/RecipeCard.tsx`, `src/components/RatingWidget.tsx`, `src/components/AdminRatingWidget.tsx`.

8. **Admin UI pages and components**: Build all admin pages (dashboard, create/edit recipe, tag management, proxy rating). Creates: `src/app/admin/page.tsx`, `src/app/admin/recipes/new/page.tsx`, `src/app/admin/recipes/[id]/edit/page.tsx`, `src/app/admin/tags/page.tsx`, `src/app/admin/ratings/page.tsx`, `src/components/RecipeForm.tsx`, `src/components/TagManager.tsx`, `src/components/ProxyRatingForm.tsx`.

## Implementation
_2026-04-02T03:30:00Z_

### Branch
`LIN-5/implementation`

### PR
https://github.com/CorbyC/statesstics/pull/1

All files implemented. Full Next.js 14 App Router application written from scratch. `npm run build` passes with no TypeScript errors (15 static pages generated).

### Files Created

**Config / scaffolding**
- `package.json` — dependencies: next 14.2.5, @supabase/ssr ^0.5.2, @supabase/supabase-js ^2.45.0, sharp ^0.33.4
- `next.config.ts` — image hostname allowlist for gmfywzvadiucgwknqyii.supabase.co
- `tsconfig.json` — strict mode, `@/*` paths aliased to `./src/*`
- `tailwind.config.ts` — content glob over `./src/**/*.{ts,tsx}`
- `postcss.config.mjs` — tailwindcss + autoprefixer
- `.gitignore` — standard Next.js ignores

**Database**
- `supabase/migrations/001_initial_schema.sql` — creates tags, recipes, recipe_tags, ratings tables; RLS enabled; seed data (Dessert, Entree, Side tags); updated_at trigger on recipes

**Library / shared**
- `src/lib/constants.ts` — ADMIN_EMAILS, MAX_RATING_USER=2, MAX_RATING_ADMIN=3, MAX_IMAGE_SIZE_BYTES
- `src/lib/types.ts` — Tag, Recipe, RecipeWithDetails, RecipeDetail, Rating, RatingWithUser interfaces
- `src/lib/supabase/client.ts` — createSupabaseBrowserClient (createBrowserClient)
- `src/lib/supabase/server.ts` — createServerSupabaseClient (createServerClient + cookies())
- `src/lib/supabase/service.ts` — createServiceSupabaseClient (createClient + SUPABASE_SERVICE_ROLE_KEY)
- `src/middleware.ts` — protects all routes except /login and /api/auth/*; refreshes session

**Auth & layout**
- `src/app/globals.css` — Tailwind directives only
- `src/app/layout.tsx` — root layout, gets user server-side, passes userEmail+isAdmin to NavBar
- `src/app/page.tsx` — redirects to /recipes or /login
- `src/app/login/page.tsx` — Google OAuth sign-in card
- `src/app/api/auth/callback/route.ts` — exchanges OAuth code, redirects to /recipes

**Components**
- `src/components/NavBar.tsx` — "use client"; shows logo, email, admin badge, sign-out, admin links
- `src/components/RecipeCard.tsx` — server component; recipe card with tags + avg rating
- `src/components/RatingWidget.tsx` — "use client"; 0–2 rating buttons; POSTs to /api/recipes/[id]/ratings
- `src/components/AdminRatingWidget.tsx` — "use client"; 0–3 rating buttons (admin exclusive)
- `src/components/RecipeForm.tsx` — "use client"; create/edit form with title, description, tags checkboxes, image upload
- `src/components/TagManager.tsx` — "use client"; lists tags with delete; add-tag input
- `src/components/ProxyRatingForm.tsx` — "use client"; email + recipe + rating (0–2) for admin proxy
- `src/components/AdminRecipeList.tsx` — "use client"; recipe list with edit/delete buttons

**API routes**
- `src/app/api/recipes/route.ts` — GET (list with tags+avg), POST (admin: create)
- `src/app/api/recipes/[id]/route.ts` — GET (detail + all ratings + user emails), PATCH (admin), DELETE (admin)
- `src/app/api/recipes/[id]/ratings/route.ts` — GET (caller's own rating), POST (upsert; enforces 0–2 for non-admin, 0–3 for admin)
- `src/app/api/tags/route.ts` — GET (all), POST (admin: create)
- `src/app/api/tags/[id]/route.ts` — DELETE (admin)
- `src/app/api/upload/route.ts` — POST multipart; resizes >10MB with sharp; uploads to recipe-images bucket
- `src/app/api/admin/proxy-rating/route.ts` — POST (admin); looks up user by email via auth.admin.listUsers; upserts rating with user_id=target, rated_by_id=admin; max value 2

**Pages**
- `src/app/recipes/page.tsx` — server; recipe grid using service client
- `src/app/recipes/[id]/page.tsx` — server; recipe detail + ratings list (admin view); renders RatingWidget or AdminRatingWidget
- `src/app/admin/page.tsx` — server; admin dashboard with quick links + AdminRecipeList
- `src/app/admin/recipes/new/page.tsx` — server; admin gate + RecipeForm
- `src/app/admin/recipes/[id]/edit/page.tsx` — server; admin gate + pre-filled RecipeForm
- `src/app/admin/tags/page.tsx` — server; admin gate + TagManager
- `src/app/admin/ratings/page.tsx` — server; admin gate + ProxyRatingForm

### Key Implementation Notes
- All DB writes in API routes use the service-role client (bypasses RLS); reads use it server-side too for aggregate queries
- User email lookups for rating display use `auth.admin.listUsers()` (service role only)
- Image resize with sharp is lazy-imported (dynamic import) to avoid issues if not needed
- `recipe-images` Supabase Storage bucket must be set to public in Supabase dashboard
- Google OAuth redirect URI must be configured: `{deployment_url}/api/auth/callback`

## Code Review
_pending_

## Test Results
_pending_

## Deploy Log
_pending_
