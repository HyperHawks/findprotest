
# ProtestGlobe — Build Plan (v1: Core + Rich Posts)

A worldwide protest tracking platform with a color-coded global map, news feed, rich posts, filters, and two account tiers (Follower free, Leader paid subscription).

## Stack & Services

- **Frontend**: TanStack Start (existing), Tailwind + shadcn/ui, Mapbox GL JS
- **Backend**: Lovable Cloud (Postgres, Auth, Storage, server functions)
- **Map**: Mapbox GL (needs public + secret token via Mapbox connector)
- **News**: External news API — recommend **GDELT** (free, global, protest-classified events) as default; NewsAPI as fallback. Fetched by a scheduled server route, cached in DB.
- **Payments**: Paddle subscription for Leader tier (monthly)
- **Rich text**: TipTap editor + media upload to Cloud Storage

## Data Model (Postgres, with RLS + grants)

- `profiles` — id (fk auth.users), display_name, avatar_url, bio, country_code, created_at
- `user_roles` — user_id, role enum(`follower`,`leader`,`admin`) — separate table (security best practice)
- `leader_subscriptions` — user_id, status, current_period_end, paddle_customer_id, paddle_subscription_id
- `protests` — id, leader_id, title, description(rich), country_code, region, city, lat, lng, start_at, end_at, cause_tags[], intensity(1-5), status(`upcoming`,`active`,`ended`,`cancelled`), verified, created_at
- `protest_attendees` — protest_id, user_id, status(`interested`,`going`), created_at
- `posts` — id, author_id, protest_id (nullable), title, body_html, media_urls[], created_at
- `post_reactions` — post_id, user_id, type
- `comments` — id, post_id, author_id, body, created_at
- `news_articles` — id, source, external_id, title, url, summary, image_url, country_code, published_at, cause_tags[], protest_id (nullable link)
- `country_stats` (materialized view or nightly refresh) — country_code, active_count, avg_intensity, color_bucket (0–5)
- `follows` — follower_id, leader_id
- `notifications` — user_id, type, payload, read_at

RLS: public read on protests/posts/news/country_stats; write scoped to owner; leader-only insert on `protests` via `has_role(auth.uid(),'leader')` + active subscription check.

## Screens / Routes

- `/` — Landing: hero + live global map preview + CTA
- `/map` — Full-screen interactive world choropleth (orange→red by intensity). Click country → zoom, load regional protest pins. Click pin → protest detail drawer.
- `/protests` — List with filters (country, cause, date, intensity, status, verified)
- `/protests/$id` — Detail: description, location, attendees, join buttons, related posts + news
- `/news` — News feed with filters (country, cause, date range, source, linked-to-protest)
- `/feed` — Community posts feed with filters
- `/posts/new` — Rich text editor (Leaders+Followers can post; only Leaders can attach a protest)
- `/posts/$id` — Post detail + comments
- `_authenticated/dashboard` — Personal: joined protests, followed leaders, notifications
- `_authenticated/leader/*` — Leader console: create/edit protests, analytics
- `/pricing` — Leader subscription tiers
- `/auth`, `/auth/callback` — Sign-in (email + Google)
- `/profile/$id` — Public profile

## Key Features

1. **Global choropleth map**: World GeoJSON, each country filled from `--protest-0` to `--protest-5` in orange→red spectrum. Zoom-to-country loads sub-region choropleth + pins.
2. **Filters everywhere**: URL-driven (`validateSearch`) so filters are shareable.
3. **Rich posts**: TipTap (bold/italic/lists/links/headings) + image/video upload to Storage bucket `post-media`.
4. **Roles**: Sign-up picks Follower (free) or Leader (redirect to Paddle checkout). Leader role only granted after webhook confirms active subscription.
5. **Join protest**: Interested / Going, with attendee count + "who's going".
6. **News ingestion**: Cron-triggered server route hits GDELT, tags by country + cause, dedupes, tries fuzzy-link to existing protests.
7. **Safety add-ons (scale features)**: Anonymous mode toggle, safety-tips panel per protest, "check-in safe" button, emergency contacts, report/flag content, translation via Lovable AI.
8. **Growth features**: Follow leaders, notifications (in-app), share cards with OG images per protest, trending page, weekly digest email.

## Payments Flow

1. `payments--recommend_payment_provider` → confirm Paddle fit for SaaS subscription.
2. `enable_paddle_payments` (user completes form).
3. Create Leader monthly product ($9.99/mo suggested; user can adjust) via `batch_create_product`.
4. Checkout on `/pricing`; webhook (`/api/public/webhooks/paddle`) upserts `leader_subscriptions` and grants `leader` role in `user_roles`; on cancellation, downgrade.

## Secrets / Integrations Needed

- Mapbox connector (public + secret token) — user connects via connector UI
- Paddle — enabled via tool
- GDELT — no key required (public); NewsAPI key optional via `add_secret` if user prefers

## Design

Orange-red intensity spectrum tokens in `styles.css` (`--protest-0` neutral → `--protest-5` deep red), dark map-first UI with high-contrast typography. Since the request is design-led, I'll run `design--create_directions` before building to let you pick a look.

## Build Order

1. Enable Lovable Cloud + schema/RLS + roles
2. Auth (email + Google) + role selection
3. Mapbox connector + `/map` with static choropleth from `country_stats`
4. Protests CRUD + `/protests` list/detail + join
5. Posts + TipTap + storage bucket
6. News ingestion cron + `/news`
7. Paddle + Leader gating
8. Dashboard, notifications, follows, share OG images
9. Safety + polish + SEO metadata per route

## Out of Scope for v1

Native push notifications, live chat during protests, livestreaming, offline mode, full i18n (translation via AI is stub-only in v1).
