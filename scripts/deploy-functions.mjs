#!/usr/bin/env node
/**
 * Razent — Deploy Edge Functions via Supabase Management API.
 *
 * Bypasses the broken MCP `deploy_edge_function` tool by calling the
 * Management API directly with a Personal Access Token (PAT).
 *
 * Prerequisites:
 *   1. A Supabase Personal Access Token (PAT)
 *      Get one at: https://supabase.com/dashboard/account/tokens
 *      (Click "Generate new token", name it "Razent deploy")
 *   2. SUPABASE_ACCESS_TOKEN env var OR .supabase-access-token file
 *      containing the PAT (starts with `sbp_`)
 *   3. SUPABASE_PROJECT_REF env var (defaults to flsjhsnfurxkzawdimyi)
 *
 * Usage:
 *   node scripts/deploy-functions.mjs                  # deploy all
 *   node scripts/deploy-functions.mjs ragent-chat      # one function
 *   node scripts/deploy-functions.mjs ragent-chat create-merchant
 */
import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, rmSync, createWriteStream } from "node:fs"
import { join, relative, resolve } from "node:path"
import { execSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const PROJECT_ROOT = resolve(__dirname, "..")
const FUNCTIONS_DIR = join(PROJECT_ROOT, "supabase", "functions")
const DEFAULT_REF = "flsjhsnfurxkzawdimyi"
const API_BASE = "https://api.supabase.com/v1"

// ── Resolve auth token ──────────────────────────────────────────
function getToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN
  const filePath = join(PROJECT_ROOT, ".supabase-access-token")
  if (existsSync(filePath)) return readFileSync(filePath, "utf-8").trim()
  console.error("❌ Missing Supabase Personal Access Token.")
  console.error("   Get one at https://supabase.com/dashboard/account/tokens")
  console.error("   Then either:")
  console.error("     set SUPABASE_ACCESS_TOKEN=sbp_*** in your env, OR")
  console.error(`     save the token to ${filePath}`)
  process.exit(1)
}

const TOKEN = getToken()
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? DEFAULT_REF

// ── Determine which functions to deploy ────────────────────────
const requested = process.argv.slice(2)
let toDeploy
if (requested.length > 0) {
  toDeploy = requested
} else {
  toDeploy = readdirSync(FUNCTIONS_DIR).filter((name) => {
    const full = join(FUNCTIONS_DIR, name)
    return statSync(full).isDirectory() && existsSync(join(full, "index.ts"))
  })
}

if (toDeploy.length === 0) {
  console.error(`❌ No functions found in ${FUNCTIONS_DIR}`)
  process.exit(1)
}

console.log(`📦 Deploying ${toDeploy.length} function(s) to project ${PROJECT_REF}:`)
for (const f of toDeploy) console.log(`   - ${f}`)

// ── Build a tar.gz of each function directory ──────────────────
const tmpDir = join(PROJECT_ROOT, ".deploy-functions-tmp")
if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true })
mkdirSync(tmpDir, { recursive: true })

async function deployFunction(name) {
  const fnDir = join(FUNCTIONS_DIR, name)
  const tarPath = join(tmpDir, `${name}.tar.gz`)

  // tar the function directory contents (so the archive root has index.ts, deno.json)
  // On Windows + git-bash, `tar` is available
  execSync(`tar -czf "${tarPath}" -C "${fnDir}" .`, { stdio: "pipe" })

  const fileBuffer = readFileSync(tarPath)
  console.log(`\n🚀 Deploying ${name} (${(fileBuffer.length / 1024).toFixed(1)} KB)...`)

  // Use multipart/form-data
  const form = new FormData()
  // The Management API expects a file under a specific field name.
  // The Supabase CLI uses "file" for the tarball.
  const blob = new Blob([fileBuffer], { type: "application/gzip" })
  form.append("file", blob, `${name}.tar.gz`)

  const url = `${API_BASE}/projects/${PROJECT_REF}/functions/deploy?slug=${encodeURIComponent(name)}&verify_jwt=false`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      // Do NOT set Content-Type; fetch sets the multipart boundary automatically
    },
    body: form,
  })

  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }

  if (res.ok) {
    console.log(`   ✅ ${name} deployed`)
    if (json?.id) console.log(`      version: ${json.id}`)
    if (json?.status) console.log(`      status:  ${json.status}`)
  } else {
    console.error(`   ❌ ${name} deploy failed (${res.status})`)
    console.error(`      ${text.slice(0, 500)}`)
    throw new Error(`Deploy failed: ${name}`)
  }
}

try {
  for (const name of toDeploy) {
    await deployFunction(name)
  }
  console.log("\n🎉 All functions deployed successfully.")
  console.log(`\nTest ragent-chat:`)
  console.log(`  curl -X POST "https://${PROJECT_REF}.supabase.co/functions/v1/ragent-chat" \\`)
  console.log(`    -H "Content-Type: application/json" \\`)
  console.log(`    -d '{"messages":[{"role":"user","content":"What fresh fruits do you have?"}],"surface":"store","session_id":"demo"}'`)
} catch (err) {
  console.error(`\n❌ Deployment failed: ${err.message}`)
  process.exit(1)
} finally {
  // Cleanup
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true })
}
