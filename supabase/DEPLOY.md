# Razent — Supabase Edge Function Deployment

The `ragent-chat` and `create-merchant` Edge Functions live in
`supabase/functions/`. They need to be **deployed** to Supabase to
work in production.

## One-time setup (5 minutes)

### Step 1: Get a Personal Access Token (PAT)

1. Go to https://supabase.com/dashboard/account/tokens
2. Click **"Generate new token"**
3. Name it `Razent deploy`
4. Copy the token (starts with `sbp_...`)

### Step 2: Save the token to your project

**Option A — env var** (preferred, never committed):
```bash
export SUPABASE_ACCESS_TOKEN="sbp_xxxxxxxxxxxxx"
```

**Option B — file** (simpler for Windows, the file is gitignored):
1. Create `C:/Users/hemal/Ragent/Razent/.supabase-access-token` (no extension)
2. Paste the `sbp_...` token into it
3. Save

### Step 3: Verify the required secrets are set in Supabase

Go to https://supabase.com/dashboard/project/flsjhsnfurxkzawdimyi/functions/secrets

| Secret | Required for | Status |
|---|---|---|
| `OPENROUTER_API_KEY` | `ragent-chat` | ⚠️ required |
| `RAZENT_ADMIN_SECRET` | `create-merchant` | optional (any random string) |

**If `OPENROUTER_API_KEY` is missing**, set it now:
1. Click **"Add new secret"**
2. Name: `OPENROUTER_API_KEY`
3. Value: your OpenRouter API key (from https://openrouter.ai/keys, starts with `sk-or-v1-...`)
4. Save

### Step 4: Run the deploy

```bash
cd "C:/Users/hemal/Ragent/Razent"
node scripts/deploy-functions.mjs
```

You should see:
```
📦 Deploying 2 function(s) to project flsjhsnfurxkzawdimyi:
   - ragent-chat
   - create-merchant

🚀 Deploying ragent-chat (16.3 KB)...
   ✅ ragent-chat deployed
   ✅ create-merchant deployed

🎉 All functions deployed successfully.
```

### Step 5: Verify ragent-chat works

```bash
curl -X POST "https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/ragent-chat" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What fresh fruits do you have?"}],"surface":"store","session_id":"demo"}'
```

Expected: a stream of `data: {...}\n\n` SSE events with `text` chunks and a `tool` event for `search_catalog`.

If you get a `503 {"error":"LLM_DISABLED"}`, the `OPENROUTER_API_KEY` secret is not set. Go back to Step 3.

If you get a `401` or `404`, the function isn't deployed yet.

## Deploying a single function

```bash
node scripts/deploy-functions.mjs ragent-chat
node scripts/deploy-functions.mjs create-merchant
```

## After deployment

- The functions auto-scale on Supabase's edge network
- Logs at https://supabase.com/dashboard/project/flsjhsnfurxkzawdimyi/functions/ragent-chat/logs
- To redeploy after code changes, just run the script again
- To remove a function: Supabase dashboard → Edge Functions → ragent-chat → Delete

## Security notes

- The PAT has the same privileges as your Supabase user — keep it secret
- The `.supabase-access-token` file is gitignored (`.gitignore` line `.env*` covers it)
- `ragent-chat` runs as **anon** (no JWT required) — anyone can call it
- `create-merchant` requires the `X-Admin-Secret` header matching `RAZENT_ADMIN_SECRET` env

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `401 Unauthorized` | Invalid or missing PAT | Regenerate at https://supabase.com/dashboard/account/tokens |
| `404 Project not found` | Wrong `SUPABASE_PROJECT_REF` | Verify with `mcp__supabase__list_projects` |
| `503 LLM_DISABLED` | Missing `OPENROUTER_API_KEY` secret | Add it in dashboard → Functions → Secrets |
| `500 Edge function crashed` | Code bug | Check logs in dashboard |
| `429 Rate limited` | Too many deploys | Wait 1 minute, retry |

## Alternative: install the Supabase CLI

If you prefer the official CLI:
```powershell
# PowerShell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\bin"
Invoke-WebRequest -Uri "https://github.com/supabase/cli/releases/download/v2.116.0/supabase_windows_amd64.zip" -OutFile "$env:USERPROFILE\bin\supabase.zip"
Expand-Archive -Path "$env:USERPROFILE\bin\supabase.zip" -DestinationPath "$env:USERPROFILE\bin\" -Force
$env:PATH = "$env:USERPROFILE\bin;$env:PATH"
```

Then:
```bash
supabase login
supabase link --project-ref flsjhsnfurxkzawdimyi
supabase functions deploy ragent-chat --no-verify-jwt
supabase functions deploy create-merchant --no-verify-jwt
```

The CLI is more featureful (logs tail, env management, etc.) but requires ~50 MB of binaries vs the script's zero dependencies.
