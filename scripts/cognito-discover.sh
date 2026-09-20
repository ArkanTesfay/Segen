#!/usr/bin/env bash
# Discovers your Cognito pool's App Clients + Hosted UI domain and prints the
# exact env block for apps/web/.env.local and apps/api/.env.
#
# Usage: ./scripts/cognito-discover.sh [USER_POOL_ID] [REGION]
set -euo pipefail

POOL_ID="${1:-us-east-2_DzYpvvqdN}"
REGION="${2:-us-east-2}"

echo "==> Pool: $POOL_ID  Region: $REGION"

if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "ERROR: AWS session expired. Run 'aws login' (or 'aws configure sso') first." >&2
  exit 1
fi

DOMAIN=$(aws cognito-idp describe-user-pool \
  --user-pool-id "$POOL_ID" --region "$REGION" \
  --query 'UserPool.Domain' --output text 2>/dev/null || true)

echo
echo "==> App clients"
aws cognito-idp list-user-pool-clients \
  --user-pool-id "$POOL_ID" --region "$REGION" \
  --query 'UserPoolClients[].{Name:ClientName,Id:ClientId}' \
  --output table

CLIENT_ID=$(aws cognito-idp list-user-pool-clients \
  --user-pool-id "$POOL_ID" --region "$REGION" \
  --query 'UserPoolClients[0].ClientId' --output text 2>/dev/null || true)

echo
if [ "$DOMAIN" = "None" ] || [ -z "$DOMAIN" ]; then
  echo "WARN: no Hosted UI domain configured yet."
  echo "      Console -> App integration -> Domain -> create one (e.g. segen-auth-dev)."
  echo "      Cognito's OIDC discovery omits authorization_endpoint without it."
  DOMAIN_URL="https://<your-domain>.auth.${REGION}.amazoncognito.com"
else
  DOMAIN_URL="https://${DOMAIN}.auth.${REGION}.amazoncognito.com"
fi

echo
echo "==> Callback URLs currently registered"
CB_JSON=$(aws cognito-idp describe-user-pool-client \
  --user-pool-id "$POOL_ID" --client-id "$CLIENT_ID" --region "$REGION" \
  --query 'UserPoolClient.{Callbacks:CallbackURLs,Logout:LogoutURLs,Grants:AllowedOAuthFlows,Scopes:AllowedOAuthScopes,HasSecret:ClientSecret}' \
  --output json 2>/dev/null || true)
echo "$CB_JSON"

SECRET=$(aws cognito-idp describe-user-pool-client \
  --user-pool-id "$POOL_ID" --client-id "$CLIENT_ID" --region "$REGION" \
  --query 'UserPoolClient.ClientSecret' --output text 2>/dev/null || true)
if [ "$SECRET" = "None" ] || [ -z "$SECRET" ]; then
  SECRET=""
  echo
  echo "==> Client is PUBLIC (no secret). Leave COGNITO_WEB_CLIENT_SECRET empty."
else
  echo
  echo "==> Client is CONFIDENTIAL (has a secret). Web env must set it or Cognito"
  echo "    returns invalid_client_secret from /oauth2/token."
fi

if echo "$CB_JSON" | grep -q "api/auth/callback/cognito"; then
  echo "OK: callback URL is registered."
else
  echo
  echo "WARN: http://localhost:3000/api/auth/callback/cognito is NOT registered."
  echo "      Cognito will answer /oauth2/authorize with error=redirect_mismatch."
  echo "      Console -> App integration -> App client -> Edit -> Hosted UI settings."
fi

echo
echo "==> Copy into apps/web/.env.local AND apps/api/.env"
cat <<EOF

AWS_REGION=${REGION}
COGNITO_USER_POOL_ID=${POOL_ID}
COGNITO_ISSUER=https://cognito-idp.${REGION}.amazonaws.com/${POOL_ID}
COGNITO_WEB_CLIENT_ID=${CLIENT_ID}
COGNITO_WEB_CLIENT_SECRET=${SECRET}
COGNITO_DOMAIN=${DOMAIN_URL}
NEXT_PUBLIC_COGNITO_ISSUER=https://cognito-idp.${REGION}.amazonaws.com/${POOL_ID}
NEXT_PUBLIC_COGNITO_CLIENT_ID=${CLIENT_ID}
NEXT_PUBLIC_COGNITO_DOMAIN=${DOMAIN_URL}
EOF

echo
echo "Then restart: (web) bun run dev   (api) go run ."
