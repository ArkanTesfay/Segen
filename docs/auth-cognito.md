# SEGEN — AWS Cognito Auth Setup

> **Web** uses the NextAuth Cognito provider, **Go** verifies RS256 JWTs via JWKS,
> **mobile** will reuse the SAME pool via Amplify. No custom crypto anywhere.
>
> Your pool: **`us-east-2_DzYpvvqdN`** — region `us-east-2` (US East Ohio).
> Issuer: `https://cognito-idp.us-east-2.amazonaws.com/us-east-2_DzYpvvqdN`
> App client: **"My web app" — `1fifo3bclseh2uqr0vkbf8e7pt`**
> Hosted UI: `https://us-east-2dzypvvqdn.auth.us-east-2.amazoncognito.com` (verified live)

## Status: Cognito is wired, 2 console fixes outstanding

`apps/web/.env.local` and `apps/api/.env` are filled in. `/api/auth/providers`
returns the `cognito` provider and `/watch/1` redirects to the Cognito sign-in
route. Two things in the Cognito console still block a successful login — both
confirmed by probing the live endpoints:

| # | Symptom from probe | Cause | Fix |
|---|---|---|---|
| 1 | `error=redirect_mismatch` on `/oauth2/authorize` | No callback URL registered on client `1fifo3bclseh2uqr0vkbf8e7pt` | Add callback + sign-out URLs (section 1) |
| 2 | `{"error":"invalid_client","error_description":"invalid_client_secret"}` on `/oauth2/token` | Client **has a secret**, but `COGNITO_WEB_CLIENT_SECRET` is empty | Paste the secret into `.env.local`, **or** switch the client to public (section 2) |

## Where Cognito sits in the flow

```
Browser -> NextAuth /api/auth/[...nextauth] -> Cognito OIDC (issuer discovery)
                     | sets next-auth.session-token cookie
              middleware.ts gates /watch + /my-list
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
| Allowed sign-out URLs | `http://localhost:3000` |
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

**Option B — make it public.** App client → Edit → **Don't generate a client
secret** → save. Then leave `COGNITO_WEB_CLIENT_SECRET` empty. Simpler, slightly
less protected; the code flow still works because the redirect is code-based.


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
- **JWKS is cached 1h** in the Go verifier; key rotation triggers a refresh.
- **No client secret** is required if the client is public; if it is confidential
  (yours currently is — see section 2) then `COGNITO_WEB_CLIENT_SECRET` must be set
  in `apps/web/.env.local` only. The Go API never needs it.
- **Mobile later:** same pool, same client id, deep-link callback `segen://auth/callback`.

Prod checklist: custom domain `auth.segen.com` (ACM cert), SES email branding
(silky black/red template), WAF on Hosted UI, rotate NEXTAUTH_SECRET into
Secrets Manager.

