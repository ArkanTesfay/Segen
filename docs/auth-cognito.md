# SEGEN — AWS Cognito Auth Setup

> **Web** uses the NextAuth Cognito provider, **Go** verifies RS256 JWTs via JWKS,
> **mobile** will reuse the SAME pool via Amplify. No custom crypto anywhere.
>
> Your pool: **`us-east-2_DzYpvvqdN`** — region `us-east-2` (US East Ohio).
> Issuer: `https://cognito-idp.us-east-2.amazonaws.com/us-east-2_DzYpvvqdN`
> App client: **"My web app" — `1fifo3bclseh2uqr0vkbf8e7pt`**
> Hosted UI: `https://us-east-2dzypvvqdn.auth.us-east-2.amazoncognito.com` (verified live)

## Status: WORKING ✅ (web sign-up + sign-in verified)

Both sign-up and sign-in complete successfully through the Cognito Hosted UI.
What it took to get there:

| Symptom | Cause | Resolution |
|---|---|---|
| `error=redirect_mismatch` on `/oauth2/authorize` | Callback URL not registered on client `1fifo3bclseh2uqr0vkbf8e7pt` | `scripts/cognito-fix.sh` registered it, plus sign-out URL, `code` grant, scopes, and `AllowedOAuthFlowsUserPoolClient=true` |
| `{"error":"invalid_client","error_description":"invalid_client_secret"}` on `/oauth2/token` | Client is **confidential** but `COGNITO_WEB_CLIENT_SECRET` was empty | Same script fetched the secret and wrote it into `apps/web/.env.local` |

Both show up in a browser as the generic Hosted UI error **"An error was
encountered with the requested page."** Cognito does not say which setting is
wrong, so when that appears, inspect the client config first (sections 1 and 2).

### Re-applying (new machine, new pool, rotated secret)

Both scripts are idempotent:

```bash
aws login                          # SSO session (interactive)
bash scripts/cognito-fix.sh        # callbacks + client secret + auth flows
bash scripts/cognito-test-login.sh # proves the token chain without a browser
cd apps/web && bun run dev         # restart so env changes take effect
```

`cognito-fix.sh` round-trips `describe-user-pool-client` →
`update-user-pool-client --cli-input-json`, so **no other client setting is lost**.
`cognito-test-login.sh` validates:

```
Cognito user -> ID token -> Go RequireAuth (JWKS RS256) -> /v1/me
```

### Verify after any auth change

- `GET /v1/me` with a real Bearer ID token → `{"sub":...,"email":...}` (not 401)
- Signed-out users see only the sign-in page: every route except `/signin`,
  `/signout`, and `/api/auth/*` redirects to `/signin`, which forwards straight
  to the Cognito Hosted UI when there is no session cookie
- `GET /api/auth/providers` lists the `cognito` provider


## Where Cognito sits in the flow

```
Browser -> NextAuth /api/auth/[...nextauth] -> Cognito OIDC (issuer discovery)
                     | sets next-auth.session-token cookie
              middleware.ts gates every route (allowlist: /signin, /signout, /api/auth)
                     | Bearer <id_token>
              Go RequireAuth -> JWKS RS256 verify -> claims in ctx
```

`isAuthMocked()` returns `true` only when the issuer or client id is missing (or
`NEXT_PUBLIC_USE_MOCK_AUTH=true`). Both are set now, so auth is **live Cognito**.

## 1. Register the callback URLs (fixes `redirect_mismatch`)

Cognito console → User pool `us-east-2_DzYpvvqdN` → **App integration** →
App client **`My web app` (`1fifo3bclseh2uqr0vkbf8e7pt`)** → **Edit** →
**Hosted UI / OAuth 2.0 settings**:

| Setting | Value |
|---|---|
| Allowed callback URLs | `http://localhost:3000/api/auth/callback/cognito` |
| Allowed sign-out URLs | `http://localhost:3000`, `http://localhost:3000/signout` |
| OAuth 2.0 grant types | ✅ **Authorization code grant** |
| OpenID Connect scopes | ✅ `openid`, `profile`, `email` |

The callback URL must match **exactly** (no trailing slash). Add
`https://segen.com/api/auth/callback/cognito` when you have a domain.

## 2. Resolve the client secret (fixes `invalid_client_secret`)

**Option A — keep the secret (recommended).** NextAuth runs server-side, so a
confidential client is the more secure choice.

```bash
aws cognito-idp describe-user-pool-client \
  --user-pool-id us-east-2_DzYpvvqdN --region us-east-2 \
  --client-id 1fifo3bclseh2uqr0vkbf8e7pt \
  --query 'UserPoolClient.ClientSecret' --output text
```

Paste into `apps/web/.env.local` → `COGNITO_WEB_CLIENT_SECRET=<value>`
(web only — the Go API just verifies JWTs and never needs the secret).

**Option B — use a public client instead.** Cognito does **not** let you remove a
secret from an existing app client, so this means creating a new one:
App clients → **Create app client** → App type **Public client** (no secret) →
same callback/sign-out URLs and the same grant/scopes as section 1 → then point
`COGNITO_WEB_CLIENT_ID` (and `NEXT_PUBLIC_COGNITO_CLIENT_ID`) at the new id and
leave `COGNITO_WEB_CLIENT_SECRET` empty. This is exactly what the CDK
`SegenAuth` stack defines (`generateSecret: false`).

## 3. Auto-discover instead of clicking

After `aws login`, this prints the ready-to-paste env block and shows whether the
callback URLs are configured correctly:

```bash
./scripts/cognito-discover.sh us-east-2_DzYpvvqdN us-east-2
```

## 4. Fill in the env values

`apps/web/.env.local` — set the client id in both server and browser form:

```bash
COGNITO_WEB_CLIENT_ID=<app client id>
NEXT_PUBLIC_COGNITO_CLIENT_ID=<same value>
COGNITO_DOMAIN=https://segen-auth-dev.auth.us-east-2.amazoncognito.com
NEXT_PUBLIC_COGNITO_DOMAIN=https://segen-auth-dev.auth.us-east-2.amazoncognito.com
```

`apps/api/.env` — same client id so the Go verifier binds tokens to it:

```bash
COGNITO_WEB_CLIENT_ID=<same value>
```

Restart both (`bun run dev`, `go run .`). `NEXT_PUBLIC_USE_MOCK_AUTH` is already
`false`, so auth flips to real Cognito as soon as the client id is present.

## 5. Create a test user

AWS Console → Cognito → `us-east-2_DzYpvvqdN` → Users → Create user
(email + temporary password), or:

```bash
aws cognito-idp admin-create-user \
  --user-pool-id us-east-2_DzYpvvqdN --region us-east-2 \
  --username demo@segen.er \
  --user-attributes Name=email,Value=demo@segen.er Name=email_verified,Value=true \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-2_DzYpvvqdN --region us-east-2 \
  --username demo@segen.er --password 'Temp1234!' --permanent
```

## 6. Verify

```bash
cd apps/web && bun run dev
# navbar "Sign in" now redirects to the Cognito Hosted UI

cd apps/api && go run .
curl -i http://localhost:8080/v1/me                      # -> 401 without a token
curl -H "Authorization: Bearer <id_token>" \
     http://localhost:8080/v1/me                         # -> {"sub":"<uuid>","email":"demo@segen.er"}
```

## Notes and gotchas

- **ID vs access token:** ID tokens carry `aud` = client id; access tokens carry
  `client_id` and no `aud`. `verifier.go` accepts either but always requires a
  match, so tokens minted for another app client in this pool are rejected.
- **Sign-out:** NextAuth `signOut()` clears only the NextAuth cookie, so the
  navbar also redirects the browser to the Hosted UI `/logout` endpoint with
  `logout_uri` = `/signout` — that ends the Cognito session AND lands on the
  dedicated sign-out page. Without it, "Sign in" would silently reuse the
  Cognito session. `http://localhost:3000/signout` must stay in Allowed
  sign-out URLs (`scripts/cognito-fix.sh` keeps it registered).
- **JWKS is cached 1h** in the Go verifier; key rotation triggers a refresh.
- **Chunked session cookies**: Cognito's id + access + refresh tokens overflow the
  4KB browser cookie limit, so NextAuth stores the session as numbered chunks
  (`next-auth.session-token.0`, `.1`, …) instead of one cookie. Anything checking
  sign-in status manually (e.g. `middleware.ts`) must treat any chunk as signed in —
  checking only the base name makes every logged-in request look anonymous and causes
  an infinite sign-in loop after the Cognito callback.
- **`NEXTAUTH_DEBUG=true`** (env var on the dev command, not committed) is the switch
  that makes NextAuth log the real token-exchange error instead of a bare 302.
- **No client secret** is required if the client is public; if it is confidential
  (yours currently is — see section 2) then `COGNITO_WEB_CLIENT_SECRET` must be set
  in `apps/web/.env.local` only. The Go API never needs it.
- **Mobile later:** same pool, same client id, deep-link callback `segen://auth/callback`.

Prod checklist: custom domain `auth.segen.com` (ACM cert), SES email branding
(silky black/red template), WAF on Hosted UI, rotate NEXTAUTH_SECRET into
Secrets Manager.

