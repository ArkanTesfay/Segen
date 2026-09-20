#!/usr/bin/env bash
# Creates (or updates) a SEGEN test user in Cognito, mints a REAL ID token via
# USER_PASSWORD_AUTH, then proves the Go API accepts it. This validates the entire
# auth chain without needing a browser:
#
#   Cognito user -> ID token -> Go RequireAuth (JWKS RS256) -> /v1/me
#
# Usage:
#   ./scripts/cognito-test-login.sh
#   ./scripts/cognito-test-login.sh <EMAIL> <PASSWORD>
set -euo pipefail

# AWS CLI v2 pages long output through `less` when stdout is a TTY -> would hang.
export AWS_PAGER=""
export AWS_CLI_AUTO_PROMPT=off

POOL_ID="${POOL_ID:-us-east-2_DzYpvvqdN}"
REGION="${REGION:-us-east-2}"
CLIENT_ID="${CLIENT_ID:-1fifo3bclseh2uqr0vkbf8e7pt}"
API_URL="${API_URL:-http://localhost:8080}"

EMAIL="${1:-demo@segen.er}"
PASSWORD="${2:-Segen1234!}"

command -v aws >/dev/null 2>&1 || { echo "ERROR: aws CLI not found on PATH" >&2; exit 1; }
aws sts get-caller-identity >/dev/null 2>&1 || {
  echo "ERROR: no valid AWS session — run 'aws login' first." >&2; exit 1; }

echo "==> ensuring user ${EMAIL}"
if aws cognito-idp admin-get-user --user-pool-id "$POOL_ID" --region "$REGION" \
     --username "$EMAIL" >/dev/null 2>&1; then
  echo "  user already exists — resetting password"
else
  aws cognito-idp admin-create-user \
    --user-pool-id "$POOL_ID" --region "$REGION" \
    --username "$EMAIL" --message-action SUPPRESS \
    --user-attributes Name=email,Value="$EMAIL" Name=email_verified,Value=true >/dev/null
  echo "  created"
fi

aws cognito-idp admin-set-user-password \
  --user-pool-id "$POOL_ID" --region "$REGION" \
  --username "$EMAIL" --password "$PASSWORD" --permanent >/dev/null
echo "  password set (permanent)"

echo "==> minting ID token"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

# Try the admin flow first: it works even when the client does not allow
# ALLOW_USER_PASSWORD_AUTH. Fall back to the standard flow.
mint() { # $1 = auth flow, $2 = subcommand
  aws cognito-idp "$2" \
    --user-pool-id "$POOL_ID" --region "$REGION" --client-id "$CLIENT_ID" \
    --auth-flow "$1" \
    --auth-parameters USERNAME="$EMAIL",PASSWORD="$PASSWORD" \
    --query 'AuthenticationResult.IdToken' --output text > "$TMP/tok" 2> "$TMP/err"
}

if mint ADMIN_USER_PASSWORD_AUTH admin-initiate-auth; then
  echo "  used ADMIN_USER_PASSWORD_AUTH"
elif mint USER_PASSWORD_AUTH initiate-auth; then
  echo "  used USER_PASSWORD_AUTH"
else
  echo "ERROR: could not mint an ID token. Most recent error:" >&2
  cat "$TMP/err" >&2
  echo >&2
  echo "  hint: run ./scripts/cognito-fix.sh first — it enables the flows this needs." >&2
  exit 1
fi

ID_TOKEN="$(cat "$TMP/tok")"
if [ -z "$ID_TOKEN" ] || [ "$ID_TOKEN" = "None" ]; then
  echo "ERROR: empty IdToken returned" >&2
  exit 1
fi
echo "  got ID token (${#ID_TOKEN} chars)"

echo "==> token claims"
printf '%s' "$ID_TOKEN" | python3 -c '
import base64, json, sys
p = sys.stdin.read().split(".")[1]
p += "=" * (-len(p) % 4)
c = json.loads(base64.urlsafe_b64decode(p))
for k in ("sub","email","iss","aud","token_use","exp"):
    if k in c: print(f"  {k}: {c[k]}")
'

echo "==> Go API checks"
printf '  GET /v1/me (no token)      -> '
curl -s -o /dev/null -w '%{http_code} (expect 401)\n' "$API_URL/v1/me"
printf '  GET /v1/me (real token)    -> '
curl -s -H "Authorization: Bearer $ID_TOKEN" "$API_URL/v1/me"; echo
printf '  GET /v1/playback/authorize -> '
curl -s -H "Authorization: Bearer $ID_TOKEN" "$API_URL/v1/playback/authorize?titleId=1" | head -c 300; echo
printf '  GET /v1/favorites          -> '
curl -s -H "Authorization: Bearer $ID_TOKEN" "$API_URL/v1/favorites" | head -c 200; echo

echo
echo "==> browser flow"
echo "  Both scripts done. Restart the web app, then sign in at:"
echo "      http://localhost:3000/signin   (redirects to Cognito Hosted UI)"
echo "  Credentials: ${EMAIL} / ${PASSWORD}"
