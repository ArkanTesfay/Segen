#!/usr/bin/env bash
# Fixes the SEGEN Cognito app client so NextAuth can complete the OAuth code flow.
#
#   redirect_mismatch      -> registers CallbackURLs / LogoutURLs
#   invalid_client_secret  -> reports the client secret so it can go in the web env
#
# The update is round-tripped through describe-user-pool-client and sent back with
# --cli-input-json, so NO other client setting is lost. Safe to re-run (idempotent).
#
# Usage:
#   ./scripts/cognito-fix.sh
#   ./scripts/cognito-fix.sh <POOL_ID> <REGION> <CLIENT_ID>
#
# Overridable env vars: COGNITO_CALLBACK, COGNITO_LOGOUT, WEB_ENV_FILE
set -euo pipefail

# AWS CLI v2 pages long output through `less` when stdout is a TTY, which would
# hang this script. Disable the pager for every aws call below.
export AWS_PAGER=""
export AWS_CLI_AUTO_PROMPT=off

POOL_ID="${1:-us-east-2_DzYpvvqdN}"
REGION="${2:-us-east-2}"
CLIENT_ID="${3:-1fifo3bclseh2uqr0vkbf8e7pt}"
CALLBACK="${COGNITO_CALLBACK:-http://localhost:3000/api/auth/callback/cognito}"
LOGOUT="${COGNITO_LOGOUT:-http://localhost:3000}"
WEB_ENV_FILE="${WEB_ENV_FILE:-apps/web/.env.local}"

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

# resolve repo root from this script's location so it works from any cwd
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
case "$WEB_ENV_FILE" in
  /*) ;;                                              # absolute: use as-is
  *)  WEB_ENV_FILE="$REPO_ROOT/$WEB_ENV_FILE" ;;      # relative: anchor to repo
esac

command -v aws >/dev/null 2>&1 || { echo "ERROR: aws CLI not found on PATH" >&2; exit 1; }

if ! aws sts get-caller-identity >/dev/null 2>&1; then
  cat >&2 <<'MSG'
ERROR: no valid AWS session.

  Fix it with one of:
    aws login            # SSO / IAM Identity Center (this account uses this)
    aws configure sso    # profile-based SSO
    aws configure        # access key + secret

  Then re-run this script.
MSG
  exit 1
fi

ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
echo "==> account ${ACCOUNT}  region ${REGION}"
echo "==> pool ${POOL_ID}  client ${CLIENT_ID}"

echo "==> describe-user-pool-client"
aws cognito-idp describe-user-pool-client \
  --user-pool-id "$POOL_ID" --client-id "$CLIENT_ID" --region "$REGION" \
  --query 'UserPoolClient' --output json > "$TMP/client.json" \
  || { echo "ERROR: cannot describe client. Wrong pool/client id, or no permission." >&2; exit 1; }

echo "==> building update payload (preserving every existing setting)"
python3 - "$TMP/client.json" "$TMP/update.json" "$CALLBACK" "$LOGOUT" <<'PY'
import json, sys
src, dst, callback, logout = sys.argv[1:5]
c = json.load(open(src))

# read-only fields that update-user-pool-client rejects
for k in ("ClientSecret", "CreationDate", "LastModifiedDate"):
    c.pop(k, None)

cbs, los = list(c.get("CallbackURLs") or []), list(c.get("LogoutURLs") or [])
if callback not in cbs: cbs.append(callback)
if logout not in los:   los.append(logout)
c["CallbackURLs"], c["LogoutURLs"] = cbs, los

flows = set(c.get("AllowedOAuthFlows") or []) | {"code"}
scopes = set(c.get("AllowedOAuthScopes") or []) | {"openid", "email", "profile"}
c["AllowedOAuthFlows"] = sorted(flows)
c["AllowedOAuthScopes"] = sorted(scopes)
c["AllowedOAuthFlowsUserPoolClient"] = True

# needed so the CLI can mint a test ID token. Cognito requires the matching flag
# (ALLOW_USER_PASSWORD_AUTH / ALLOW_ADMIN_USER_PASSWORD_AUTH) to be listed.
explicit = set(c.get("ExplicitAuthFlows") or []) | {
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_ADMIN_USER_PASSWORD_AUTH",
}
c["ExplicitAuthFlows"] = sorted(explicit)

json.dump(c, open(dst, "w"), indent=2)
print("  callback URLs :", cbs)
print("  logout URLs   :", los)
print("  oauth flows   :", c["AllowedOAuthFlows"])
print("  oauth scopes  :", c["AllowedOAuthScopes"])
print("  explicit flows:", c["ExplicitAuthFlows"])
PY

echo "==> update-user-pool-client"
aws cognito-idp update-user-pool-client \
  --cli-input-json "file://$TMP/update.json" --region "$REGION" \
  --query 'UserPoolClient.{Name:ClientName,Callbacks:CallbackURLs,Logout:LogoutURLs}' \
  --output json

SECRET=$(aws cognito-idp describe-user-pool-client \
  --user-pool-id "$POOL_ID" --client-id "$CLIENT_ID" --region "$REGION" \
  --query 'UserPoolClient.ClientSecret' --output text 2>/dev/null || true)
# `--output text` renders an absent field as the literal string "None"
if [ "$SECRET" = "None" ]; then
  SECRET=""
fi

echo
echo "==> result"
if [ -z "$SECRET" ]; then
  echo "  client is PUBLIC (no secret) -> leave COGNITO_WEB_CLIENT_SECRET empty"
else
  echo "  client is CONFIDENTIAL -> secret retrieved (${#SECRET} chars)"
fi

# sanity: authorize endpoint must no longer answer redirect_mismatch
echo
echo "==> verifying authorize endpoint accepts the callback"
DOMAIN=$(aws cognito-idp describe-user-pool --user-pool-id "$POOL_ID" --region "$REGION" \
  --query 'UserPool.Domain' --output text 2>/dev/null || echo None)
if [ "$DOMAIN" = "None" ] || [ -z "$DOMAIN" ]; then
  echo "  ! no Hosted UI domain on this pool — create one in the console:"
  echo "      Cognito -> App integration -> Domain"
  echo "    (without it, OIDC discovery omits authorization_endpoint)"
else
  ENC_CALLBACK=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1],safe=''))" "$CALLBACK")
  LOC=$(curl -s -o /dev/null -w '%{redirect_url}' \
    "https://${DOMAIN}.auth.${REGION}.amazoncognito.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&scope=openid%20email%20profile&redirect_uri=${ENC_CALLBACK}" || true)
  case "$LOC" in
    *redirect_mismatch*) echo "  ✗ still redirect_mismatch — callback not accepted" ;;
    "")                  echo "  ✓ authorize accepted the callback (no error redirect)" ;;
    *)                   echo "  ✓ redirects to login: ${LOC:0:90}..." ;;
  esac
fi

echo
echo "==> env block for ${WEB_ENV_FILE}"
cat <<EOF
COGNITO_USER_POOL_ID=${POOL_ID}
COGNITO_ISSUER=https://cognito-idp.${REGION}.amazonaws.com/${POOL_ID}
COGNITO_WEB_CLIENT_ID=${CLIENT_ID}
COGNITO_WEB_CLIENT_SECRET=${SECRET}
NEXT_PUBLIC_COGNITO_CLIENT_ID=${CLIENT_ID}
NEXT_PUBLIC_USE_MOCK_AUTH=false
EOF

if [ -n "${SECRET}" ] && [ -f "$WEB_ENV_FILE" ]; then
  python3 - "$WEB_ENV_FILE" "$SECRET" <<'PY'
import re, sys
path, secret = sys.argv[1], sys.argv[2]
line = 'COGNITO_WEB_CLIENT_SECRET=' + secret
# lambda replacement => secret is inserted literally (no backslash/group escapes)
txt = open(path).read()
new, n = re.subn(r'^COGNITO_WEB_CLIENT_SECRET=.*$', lambda m: line, txt, flags=re.M)
if n:
    open(path, 'w').write(new)
    print(f"  updated COGNITO_WEB_CLIENT_SECRET in {path}")
else:
    with open(path, 'a') as fh:
        fh.write(('' if txt.endswith('\n') else '\n') + line + '\n')
    print(f"  appended COGNITO_WEB_CLIENT_SECRET to {path}")
PY
fi

echo
echo "Next: restart the web app so the env is picked up ->  cd apps/web && bun run dev"
