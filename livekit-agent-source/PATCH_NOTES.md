# agent.py — patch notes for jutra integration

Apply this `agent.py` to the `Dakota-1d3e` LiveKit worker repo and redeploy.

## What changed vs. original

1. **Metadata parsing** (`_parse_participant`)
   Reads `participant.metadata` JSON → `{uid, display_name, base_age}`. Falls back to `jutra_<uid>` pattern on `identity`. `base_age` clamped to `[10, 80]`. No fixed horizon — the agent now picks its age standpoint per reply on the backend.

2. **Boot (`_boot_persona`)**
   Before starting the session we call MCP:
   - `get_persona_snapshot(uid)`
   - `get_chronicle_tool(uid, limit=20)`
   and inject the result into the Agent's system prompt via `_format_persona_block`.

3. **New `JutraAgent`** (replaces `DefaultAgent`)
   - `on_enter`: short, natural Polish greeting using `display_name`.
   - `on_user_turn_completed`: sends the raw STT text to MCP
     `chat_with_future_self_tool` (payload: `{uid, message, display_name, base_age, use_rag, fast}`) and speaks the returned `response` **verbatim**
     via `session.say()`. Raises `StopResponse()` so the LLM never runs.

4. **System prompt (`BASE_INSTRUCTIONS`)**
   Polish, strict: the agent is a thin router, never authors replies, never
   calls onboarding / ingest tools (those are frontend-only).

5. **Fixes**
   - TTS `language="fr"` → `"pl"`.
   - `preemptive_generation=True` → `False` (we bypass LLM, so preempting is waste).

## New env vars

- `JUTRA_BACKEND_URL` — e.g. `https://jutra-277240793881.europe-west4.run.app`
- `MCP_BEARER_TOKEN` — optional; currently empty for hackathon.
- `JUTRA_MCP_TIMEOUT` — optional, seconds (default `20`).
- `AGENT_LLM_MODEL` — optional, LLM model id. Defaults:
  - `agent.py` (LiveKit Inference): `google/gemini-3-flash-preview`. Safe
    fallbacks: `google/gemini-2.5-flash`, `openai/gpt-5.4`.
  - `deploy/agent.py` (direct Vertex AI via `google` plugin):
    `gemini-3-flash-preview`. Safe fallback: `gemini-2.5-flash`.
  Note: Gemini 3 Flash is currently Public Preview on Vertex; Google can
  sunset preview slugs with ~2-week notice (see
  `integrations/livekit-integration.md` in the backend repo). If replies
  suddenly 404, flip this env var to the `2.5-flash` variant without
  redeploying code.

Add these to `.env.local` (or LiveKit Cloud Agents secrets, depending on your deploy).

## New dependency

```
pip install mcp
```

Or add `mcp>=1.2.0` to your existing `requirements.txt` / `pyproject.toml`. See
`requirements-jutra.txt` in this folder.

## Upload / redeploy

If you deploy via `lk agent deploy`, just push the new `agent.py` + updated
requirements and bounce the worker. The frontend (`jutra-web`) is already
emitting the correct `participantMetadata`, so the worker will pick up
`uid`/`display_name`/`base_age` on the next session.
