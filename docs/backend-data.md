# SEGEN — Backend data layer (Postgres 16 + Redis 7 via Docker)

## Start

```bash
cd /Users/arkanmekonen/Desktop/EritreaFilmVenue
docker compose up -d
docker ps  # segen-postgres + segen-redis healthy
```

Defaults (match `.env.example`):
- `DATABASE_URL=postgres://segen:segen@localhost:5432/segen?sslmode=disable`
- `REDIS_URL=redis://localhost:6379`

## Migrations

Go runs `apps/api/migrations/*.sql` on boot (`migrate.go`):

- `001_init.sql` — `users` (cognito_sub unique), `profiles`, `titles`
  (+ `pg_trgm` trigram + `tsvector` full-text), `watch_history`, `favorites`
- `002_seed.sql` — 12 Eritrean titles (same slugs as web mock)

Reset:

```bash
docker compose down -v   # wipes pgdata + redisdata
docker compose up -d
cd apps/api && go run .  # re-applies migrations + seed
```

## API (all verified with `curl` below)

Public (Redis cached 60s):
- `GET /health`
- `GET /v1/titles` — trending-first
- `GET /v1/titles/:slug`
- `GET /v1/search?q=teza` — tsvector + ILIKE fallback

Authed (`Authorization: Bearer <Cognito JWT>`):
- `GET /v1/me`
- `GET /v1/playback/authorize?titleId=1` — resume from Postgres
- `GET /v1/progress` — continue-watching (incomplete, newest first)
- `POST /v1/progress {"titleId","watchedSeconds","durationSeconds"}` — 92% => completed
- `GET /v1/favorites` / `POST /v1/favorites?titleId=1` — toggle

## Switching web from mock → real API

`apps/web/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_USE_MOCK=false
```

`packages/api-client` already uses the same paths — no UI rewrite.
Auth: web sends the NextAuth/Cognito access token as `Bearer`; Go verifies
RS256 via JWKS and upserts the `users` row on first write.

## AWS infra (CDK — no Terraform in this project)

```bash
cd infra/cdk && bun install
npx cdk bootstrap aws://<account>/us-east-1   # once
bun run deploy:auth    # Cognito pool + client + Hosted UI
bun run deploy:video   # S3 masters + HLS + CloudFront
bun run diff           # preview changes
```

Stacks: `SegenAuth` (`lib/auth-stack.ts`), `SegenVideo` (`lib/video-stack.ts`).

