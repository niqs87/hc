# AGENTS.md — jutra voice AI operational runbook

Single source of truth for the **jutra** voice AI stack. Read this before making any deploy, config, or model change.

This repo (`jutra-front`) ships two deployables:

1. **`jutra-web`** — Next.js frontend on Cloud Run (`europe-west4`). User-facing voice UI + onboarding flow.
2. **LiveKit voice worker** — Python agent in `livekit-agent-source/deploy/`, deployed to LiveKit Cloud (`eu-central`).

The backend MCP/REST service (`jutra`) lives in a sibling repo: `~/projects/hackcarpathia` (also Cloud Run `europe-west4`).

---

## 1. System architecture (who sits where)

```
┌────────────┐    WebRTC     ┌──────────────────────┐
│  Browser   │──────────────▶│ LiveKit SFU (edge,   │
│ (EU user)  │◀──────────────│ auto-picked nearest) │
└────────────┘               └──────────┬───────────┘
                                        │ worker dispatch
                                        ▼
                        ┌───────────────────────────────┐
                        │  LiveKit voice agent worker   │
                        │  eu-central (Frankfurt)       │
                        │  agent_name = "Dakota-1d3e"   │
                        │  id = CA_XkyynNdc2UmV         │
                        └───┬────────────────────┬──────┘
                            │                    │
                            │ LiveKit Inference  │ MCP Streamable HTTP
                            │ gateway (billed via│ Bearer (empty for hack)
                            │ LiveKit credits)   │
                            ▼                    ▼
            ┌──────────────────────────────┐ ┌──────────────────────┐
            │ Deepgram STT (nova-3, pl)    │ │ jutra backend MCP    │
            │ Google Gemini 3 Flash (LLM)  │ │ Cloud Run            │
            │ ElevenLabs TTS (multiling.)  │ │ europe-west4         │
            └──────────────────────────────┘ └──────────┬───────────┘
                                                         │
                                                         ▼
                                               ┌───────────────────┐
                                               │ Firestore (EU) +  │
                                               │ Gemini 3.1 Pro    │
                                               │ (reasoning), 2.5  │
                                               │ (fallback),       │
                                               │ text-embedding-005│
                                               └───────────────────┘
```

**Voice turn flow** (`JutraAgent` in `livekit-agent-source/deploy/agent.py`):

1. User speaks → STT → text.
2. `on_user_turn_completed` calls MCP `chat_with_future_self_tool` (backend authors the reply).
3. `session.say()` speaks the returned text verbatim via TTS. `raise StopResponse()` — the LLM on the worker side never runs for the main conversational path.
4. The worker LLM (Gemini 3 Flash) exists only for greetings / fallbacks when MCP fails.

**Why co-locate in EU:** every MCP call blocks the voice turn, so a transatlantic hop adds ~200 ms per turn. See §3.

---

## 2. Component map

| Component | Where | Config / ID | Notes |
|---|---|---|---|
| LiveKit project | `hackcarpathia-62etizup.livekit.cloud` | CLI project alias `jutra` | Single-agent plan (1/1 quota) |
| Voice agent | LiveKit Cloud `eu-central` (Frankfurt) | `CA_XkyynNdc2UmV`, `agent_name=Dakota-1d3e` | Config: `livekit-agent-source/deploy/livekit.toml` |
| Agent source (template) | `livekit-agent-source/agent.py` | Uses `inference.*` (LiveKit Inference) | Reference copy; kept in sync with deploy |
| Agent source (deployed) | `livekit-agent-source/deploy/agent.py` | Uses `inference.*` (LiveKit Inference) | All three providers (Deepgram/Google/ElevenLabs) billed through LiveKit gateway credits |
| Frontend | Cloud Run `europe-west4` | `jutra-web` | `https://jutra-web-277240793881.europe-west4.run.app` |
| Backend MCP/REST | Cloud Run `europe-west4` | `jutra` | `https://jutra-277240793881.europe-west4.run.app` |
| Backend source | `~/projects/hackcarpathia` | `make deploy` / `./scripts/deploy.sh` | Uses Vertex AI + Firestore |
| Service account | `jutra-689@jutra-493710.iam.gserviceaccount.com` | Key: `~/projects/hackcarpathia/jutra-493710-f25c69585e55.json` | Used by worker + backend |
| MCP bearer secret | GCP Secret Manager `mcp-bearer` in `jutra-493710` | Empty string for hackathon | `gcloud secrets versions access latest --secret=mcp-bearer --project=jutra-493710` |

---

## 3. Regions — the most important operational fact

**Never deploy the agent outside `eu-central`** unless the user base shifts. Region assignment in LiveKit Cloud is **immutable** per agent — you have to delete + recreate.

| Service | Region | Why it matters |
|---|---|---|
| Frontend | `europe-west4` | Close to EU users; fine |
| Backend MCP | `europe-west4` | **Every voice turn blocks on an MCP call.** Agent must be in EU. |
| Voice agent | `eu-central` (Frankfurt) | ~5–15 ms RTT to backend. us-east added ~200 ms per turn — don't. |
| LiveKit Inference (STT/LLM/TTS) | Provider-routed via LiveKit edge | Worker doesn't pick a region; LiveKit routes internally. Adds <50 ms on top of provider latency. |
| Firestore | EU multi-region | Backend concern; not directly touched by worker |

Available LiveKit agent regions (2026): `us-east`, `eu-central`, `ap-south`. Only 1 agent allowed on current plan → **delete-then-create** when moving regions.

---

## 4. Model configuration

All three voice providers route through **LiveKit Inference** (provider-prefixed model names). Billed against LiveKit Cloud gateway credits — no separate Deepgram / Google / ElevenLabs accounts or ADC needed on the worker.

### Defaults (deploy/agent.py)

| Slot | Provider | Model | Voice / language |
|---|---|---|---|
| STT | Deepgram | `deepgram/nova-3` | `language="pl"` |
| LLM | Google (via LiveKit) | `google/gemini-3-flash-preview` | — |
| TTS | ElevenLabs | `elevenlabs/eleven_multilingual_v2` | voice `bIHbv24MWmeRgasZH58o`, `language="pl"` |

### Env-driven override (no code change)

| Env var | Purpose | Example values | Default |
|---|---|---|---|
| `AGENT_LLM_MODEL` | Worker LLM | `google/gemini-2.5-flash`, `openai/gpt-5.4`, `anthropic/claude-sonnet-4.6` | `google/gemini-3-flash-preview` |
| `AGENT_STT_MODEL` | STT | `deepgram/nova-3`, `deepgram/nova-2`, `google/latest_long` | `deepgram/nova-3` |
| `AGENT_STT_LANGUAGE` | STT language hint | `pl`, `en` | `pl` |
| `AGENT_TTS_MODEL` | TTS | `elevenlabs/eleven_multilingual_v2`, `cartesia/sonic-2` | `elevenlabs/eleven_multilingual_v2` |
| `AGENT_TTS_VOICE` | Voice id | ElevenLabs voice id | `bIHbv24MWmeRgasZH58o` |
| `AGENT_TTS_LANGUAGE` | TTS language | `pl`, `en` | `pl` |
| `JUTRA_MCP_TIMEOUT` | MCP call timeout in seconds | `60` (safe for Gemini 3.1 Pro reasoning + RAG) | `60` |

### Model fallback ladder (if Gemini 3 preview breaks)

1. `AGENT_LLM_MODEL=google/gemini-2.5-flash` — GA via LiveKit Inference.
2. `AGENT_LLM_MODEL=openai/gpt-5.4` — different provider entirely, isolates Google-side issues.
3. Backend has its own `FALLBACK_MODEL=gemini-2.5-flash` (see `hackcarpathia/scripts/deploy.sh`) which triggers automatically on `NotFound` / `FailedPrecondition` for reasoning calls.

### Why LiveKit Inference (and not direct Google/Vertex)?

We briefly ran a direct-Vertex variant (`lkgoogle.LLM(vertexai=True, ...)` + Google Cloud STT/TTS) after LiveKit Gateway Credits looked exhausted. That path was fragile:

- Vertex model availability is region-gated — `gemini-3-flash-preview` only works on the `global` endpoint, not `europe-west4`.
- Google Cloud Streaming TTS rejects every Wavenet/Neural2 voice; only `pl-PL-Chirp3-HD-*` voices work, which sound noticeably different from the ElevenLabs voice we picked for the product.
- Requires an SA key stored as a LiveKit secret (`GOOGLE_APPLICATION_CREDENTIALS_JSON`) plus three `GOOGLE_CLOUD_*` env vars, and any `--overwrite` slip wipes them all (see §6).

Top-ups via LiveKit credits are the supported path — cheaper ops-wise and no ADC plumbing.

### User-facing LLM path is mostly fallback

The voice agent is a **thin shell**: every user turn goes through MCP `chat_with_future_self_tool`, and the backend authors the reply. The worker's LLM (Gemini 3 Flash) is only invoked for the greeting and connection-loss fallbacks.

### Backend `fast=true` mode (voice-only shortcut)

The MCP tool `chat_with_future_self_tool` accepts a `fast: bool = False` parameter. The voice worker passes `fast: True` on every turn; the web frontend does not. When enabled:

- Forces `MODEL_CHAT=gemini-3-flash-preview` regardless of horizon (overrides `_kind_for_horizon` which would otherwise route horizon=30 to `MODEL_REASONING`).
- Sets `thinking_budget=0` (no reasoning tokens before first output).
- Caps `max_output_tokens=400` (TTS finishes faster, bills less).

This path is still used as the **fallback** when SSE streaming (below) fails.

### Streaming voice path (Pattern C — current default)

The voice worker now consumes `POST /voice/chat-stream` over SSE instead of the blocking MCP tool. Tokens are piped into `session.say(async_iter)` so **ElevenLabs TTS starts synthesising after the first Gemini chunk** (~1.5 s) instead of waiting for the full reply (~3.5 s).

**Wire format** (SSE, `text/event-stream`):

```
event: meta
data: {"crisis": false, "severity": 0, "pii_redactions": {...}}

event: delta
data: {"text": "Jestem symulacją Twojego..."}

event: delta
data: {"text": " za dwadzieścia lat..."}

event: done
data: {"response": "<full accumulated text>"}
```

On crisis detection the backend emits a single `delta` with the hard-coded helpline body and no LLM call happens. On error, `event: error` is emitted.

**Backend pieces** (hackcarpathia):
- `jutra/infra/vertex.py::generate_stream_with_fallback` — async wrapper around `client.aio.models.generate_content_stream` with model-not-found fallback before the first chunk.
- `jutra/agents/future_self.py::future_self_reply_stream` — pins the voice preset (flash, thinking=0, max_output=400) and streams deltas.
- `jutra/services/chat.py::chat_with_future_self_stream` — orchestrates PII + crisis + optional RAG embed, then streams. Fires `extract_and_save` after `done` (best-effort).
- `jutra/api/voice.py` — `POST /voice/chat-stream` endpoint, auth'd with `MCP_BEARER_TOKEN` (same as MCP).
- **Disclosure prefix is NOT prepended** in this path (the voice worker speaks the disclosure once at session start; prepending it every turn would make it the first thing TTS synthesises).

**Worker pieces** (`livekit-agent-source/deploy/agent.py`):
- `_stream_chat_events()` — minimal SSE parser over `httpx.AsyncClient.stream`.
- `JutraAgent._try_stream_and_speak()` — feeds deltas into an `asyncio.Queue`, wraps it as an `AsyncIterator[str]`, and passes that to `session.say(text_stream(), allow_interruptions=True)`. LiveKit's `AgentOutput._stream_synthesis_task` iterates that and pushes sentence-sized windows into the ElevenLabs streaming TTS, so playback starts on the first chunk.
- `_blocking_chat_and_speak()` — unchanged MCP path, kept as fallback on stream failure (first-frame timeout, HTTP error, etc.). This is what makes Pattern C safe to roll out.

**Emergency rollback** (no redeploy): set LiveKit secret `JUTRA_STREAMING=0` via the §6 template. The worker falls back to the MCP `chat_with_future_self_tool` with `fast=True`.

Measured impact (horizon=30, warm backend, EU→EU):

| Mode | p50 latency to first audio |
|---|---|
| `fast=False`, `MODEL_REASONING=gemini-3.1-pro-preview` (pre-fix) | 10–16 s |
| `fast=False`, `MODEL_REASONING=gemini-3-flash-preview` (Option A) | 6–7 s |
| `fast=True` blocking (Option B) | 3–4 s |
| **SSE streaming (Pattern C, current)** | **1.5–2 s** |

End-to-end voice turn budget with streaming: ~0.5 s STT + ~1.5 s to first Gemini chunk + ~0.7 s TTS TTFB ≈ **~3 s** perceived from end-of-speech to first audio. Total response playback still takes ~4–5 s but the user hears the agent start talking much sooner.

**Caveats:**
- If Gemini emits a single large final chunk (rare with streaming), we revert to the blocking experience.
- Interruptions during streaming cancel the SSE stream and the `extract_and_save` on the backend won't fire for that turn — acceptable (the user's message was interrupting anyway).
- SSE is kept alive via `X-Accel-Buffering: no`; Cloud Run load balancer honours this.

---

## 5. CLI runbook

All commands run from `livekit-agent-source/deploy/`. The `livekit.toml` there is the single source of truth (no `--config` flag needed).

### Deploy

```bash
cd livekit-agent-source/deploy
lk agent deploy --project jutra
```

Build takes ~90 s. Schedule + worker registration another ~30 s.

### Check status / logs

```bash
lk agent status --project jutra
lk agent logs   --project jutra
lk agent logs   --project jutra --log-type=build    # Docker build logs
```

### Restart (picks up new secrets without redeploying code)

```bash
lk agent restart --project jutra
```

### Rollback

```bash
lk agent versions --project jutra
lk agent rollback --project jutra --version <vYYYYMMDDHHMMSS>
```

### Move to a different region (destructive)

LiveKit regions are immutable — this is a delete-then-create flow. See §3 for the single-agent quota constraint.

```bash
lk agent delete --project jutra -y
lk agent create --project jutra --region eu-central \
  --secrets-file /tmp/lk_secrets.env --silent
```

Writes a fresh agent id to `livekit.toml`.

---

## 6. Secrets management — READ BEFORE TOUCHING

**GOTCHA:** `lk agent update-secrets --overwrite` **wipes the entire secret set** and replaces it with only the keys you pass. It is not a merge. I learned this by wiping 5 out of 6 secrets trying to change one.

### Current secret inventory

Verify with `lk agent secrets --project jutra`. Should be exactly these 3 (plus optional streaming toggles):

| Secret | Source of truth | Value shape |
|---|---|---|
| `JUTRA_BACKEND_URL` | Cloud Run | `https://jutra-277240793881.europe-west4.run.app` |
| `JUTRA_MCP_TIMEOUT` | Latency budget for `chat_with_future_self_tool` (fallback path) | `60` (seconds) |
| `AGENT_LLM_MODEL` | Model pin (see §4 for fallback ladder) | `google/gemini-3-flash-preview` |
| `JUTRA_STREAMING` (optional) | Toggle SSE streaming voice path; unset = enabled | `0` to disable (rollback) |
| `JUTRA_STREAM_FIRST_FRAME_TIMEOUT` (optional) | Seconds to wait for first SSE frame before falling back to MCP | `15` (default) |

No service account key, no Google Cloud config — LiveKit Inference handles all of that.

### Safe update template (always use this)

```bash
cat > /tmp/lk_secrets.env <<'EOF'
JUTRA_BACKEND_URL=https://jutra-277240793881.europe-west4.run.app
JUTRA_MCP_TIMEOUT=60
AGENT_LLM_MODEL=google/gemini-3-flash-preview
EOF
chmod 600 /tmp/lk_secrets.env

lk agent update-secrets --project jutra --secrets-file /tmp/lk_secrets.env --overwrite -y
rm /tmp/lk_secrets.env
```

To add a new secret (e.g. `AGENT_TTS_VOICE`), add a line to the `cat` heredoc and re-run the whole command. Do **not** call `update-secrets --secrets KEY=VAL --overwrite` with a partial set — it will nuke everything else.

---

## 7. Frontend deploy (jutra-web on Cloud Run)

```bash
cd ~/projects/jutra-front
export PROJECT=jutra-493710 REGION=europe-west4
export LIVEKIT_URL=... LIVEKIT_API_KEY=... LIVEKIT_API_SECRET=...
export JUTRA_BACKEND_URL=https://jutra-277240793881.europe-west4.run.app
export AGENT_NAME=Dakota-1d3e
./scripts/deploy.sh
```

Frontend never exposes `JUTRA_BACKEND_URL` to the browser — all backend calls go through server-side proxies in `app/api/jutra/*`.

---

## 8. Backend deploy (hackcarpathia)

Out of scope for this repo, but voice agent depends on it. Quick reference:

```bash
cd ~/projects/hackcarpathia
make deploy                # runs scripts/deploy.sh
make run                   # local dev on :8080
API_BEARER_TOKEN=dev MCP_BEARER_TOKEN=dev make run  # local with bearer
```

Backend models (see `hackcarpathia/scripts/deploy.sh` env vars):

- `MODEL_REASONING=gemini-3.1-pro-preview` — horizon=30 chat path on the **web** only (voice never reaches this — see below). Briefly flipped to flash-preview as a latency stop-gap before streaming landed; reverted once Pattern C made voice latency model-agnostic.
- `MODEL_CHAT=gemini-3-flash-preview` — horizon 5/10/20 on web, **and every voice turn** regardless of horizon (voice always uses the fast/streaming preset).
- `MODEL_EXTRACT=gemini-3.1-flash-lite-preview` — onboarding extraction
- `EMBED_MODEL=text-embedding-005` at `europe-west4`
- `FALLBACK_MODEL=gemini-2.5-flash` — auto-fallback on preview NotFound

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Frontend shows transcript but no audio reply | TTS or MCP failure closes session; next `session.say` hits "AgentSession is closing" | Tail logs for the **first** error per session: usually a TTS 4xx or an MCP timeout. |
| `chat_with_future_self_tool failed ... TimeoutError` | `JUTRA_MCP_TIMEOUT` too tight for backend reasoning | Bump to `60` (already the default) via §6 |
| `JUTRA_BACKEND_URL is not set` in worker logs | Secret-wipe gotcha | Restore full secret set via §6 |
| `insufficient credits` / `gateway quota exceeded` on LiveKit Inference | Gateway Credits exhausted | Top up credits in LiveKit Cloud dashboard |
| `maximum number of agents reached (1/1)` | LiveKit Cloud plan single-agent limit | Delete existing before `create`, or upgrade plan |
| Voice replies feel sluggish (>2 s before audio) | Backend reasoning dominates (Gemini 3.1 Pro); agent region OK | Consider swapping backend `MODEL_REASONING` to a flash model for demos |
| Frontend can't reach worker | Agent_name mismatch between worker decorator and frontend dispatch | Must match: `@server.rtc_session(agent_name="Dakota-1d3e")` |
| (Historical) `Currently, only Chirp 3: HD voices are supported for streaming synthesis.` | Only affected the short-lived direct-Google TTS variant; no longer deployed | — (see §4 "why LiveKit Inference") |

### Log streaming is "from now on"

`lk agent logs` only shows new lines from the moment you start tailing. To see startup logs you have to tail *while* restarting, e.g.:

```bash
(lk agent logs --project jutra > /tmp/logs.txt 2>&1 &) && \
  lk agent restart --project jutra && sleep 20 && \
  grep "jutra backend config\|registered worker" /tmp/logs.txt
```

---

## 10. Known follow-ups (not blocking)

- Keep `livekit-agent-source/agent.py` (template) in sync with `deploy/agent.py` — they've diverged again since streaming was added to `deploy/agent.py` only.
- Add MCP bearer rotation once `mcp-bearer` secret stops being empty.
- Document multi-region deployment once plan allows >1 agent.
- **DONE:** LLM→TTS streaming (Pattern C). Perceived latency ~3 s. See §4 "Streaming voice path".
- Merge the SSE parser in `deploy/agent.py` with `httpx-sse` once we need reconnection semantics (current parser is deliberately minimal: single-shot, no backoff).

See `~/projects/hackcarpathia/backlog.md` for backend-side follow-ups.
