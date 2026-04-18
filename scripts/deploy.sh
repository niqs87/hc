#!/usr/bin/env bash
# Deploy jutra-web (Next.js) to Cloud Run in the same project as the jutra API.
set -euo pipefail

PROJECT="${PROJECT:-jutra-493710}"
REGION="${REGION:-europe-west4}"
SERVICE="${SERVICE:-jutra-web}"

: "${LIVEKIT_URL:?Set LIVEKIT_URL}"
: "${LIVEKIT_API_KEY:?Set LIVEKIT_API_KEY}"
: "${LIVEKIT_API_SECRET:?Set LIVEKIT_API_SECRET}"
: "${JUTRA_BACKEND_URL:?Set JUTRA_BACKEND_URL (jutra API base URL)}"

AGENT_NAME="${AGENT_NAME:-}"

echo "==> Deploying ${SERVICE} to ${PROJECT}/${REGION}"

gcloud run deploy "${SERVICE}" \
  --quiet \
  --project="${PROJECT}" \
  --region="${REGION}" \
  --source="$(cd "$(dirname "$0")/.." && pwd)" \
  --allow-unauthenticated \
  --port=8080 \
  --min-instances=0 \
  --max-instances=5 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=120 \
  --set-env-vars="LIVEKIT_URL=${LIVEKIT_URL}" \
  --set-env-vars="LIVEKIT_API_KEY=${LIVEKIT_API_KEY}" \
  --set-env-vars="LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}" \
  --set-env-vars="JUTRA_BACKEND_URL=${JUTRA_BACKEND_URL}" \
  --set-env-vars="AGENT_NAME=${AGENT_NAME}"

PROJECT_NUMBER="$(gcloud projects describe "${PROJECT}" --format='value(projectNumber)')"
URL="https://${SERVICE}-${PROJECT_NUMBER}.${REGION}.run.app"
echo "==> Deployed at ${URL}"

echo "==> Smoke GET /"
curl -fsS -o /dev/null "${URL}/" || {
  echo "FATAL: GET / failed" >&2
  exit 1
}

echo "==> Smoke POST /api/token"
curl -fsS -X POST "${URL}/api/token" \
  -H 'Content-Type: application/json' \
  -d '{"room_config":{}}' \
  | head -c 200
echo

echo "==> OK: ${URL}"
echo "URL=${URL}" > "$(cd "$(dirname "$0")/.." && pwd)/.deploy_url"
