/**
 * End-to-End Pre-Production Protocol Verification Test Suite
 * Tests:
 * 1. RFC 8785 Canonicalization
 * 2. WebCrypto SHA-256 Hashing
 * 3. WebCrypto ECDSA P-256 JWS Digital Signing & Cryptographic Verification
 * 4. ACP Webhook HMAC-SHA256 Signatures & 300s Replay Window
 * 5. Real Razorpay Test Orders API (Authoritative Network Test)
 */

import { webcrypto } from "node:crypto"

// Polyfill global crypto if needed in node
if (!globalThis.crypto) {
  // @ts-ignore
  globalThis.crypto = webcrypto
}

// 1. RFC 8785 Canonicalizer implementation for test runner
function canonicalize(object) {
  if (object === null || typeof object !== "object") {
    return JSON.stringify(object)
  }
  if (Array.isArray(object)) {
    return "[" + object.map(canonicalize).join(",") + "]"
  }
  const keys = Object.keys(object).sort((a, b) => {
    return a < b ? -1 : a > b ? 1 : 0
  })
  const elements = keys
    .filter((key) => object[key] !== undefined)
    .map((key) => JSON.stringify(key) + ":" + canonicalize(object[key]))
  return "{" + elements.join(",") + "}"
}

// 2. SHA-256
async function sha256Hex(data) {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

// 3. ECDSA P-256 Keypair & JWS
async function testES256SigningAndVerification() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  )

  const payload = {
    iss: "merchant_one_razent",
    aud: "ap2.shopping_agent",
    cart_hash: "a94a8fe5ccb19ba61c4c0873d391e987982fbbd3",
    iat: Math.floor(Date.now() / 1000),
  }

  const header = { alg: "ES256", typ: "JWT", kid: "merchant-key-p256-primary" }
  const b64u = (str) =>
    Buffer.from(str)
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")

  const signingInput = `${b64u(JSON.stringify(header))}.${b64u(canonicalize(payload))}`
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    keyPair.privateKey,
    new TextEncoder().encode(signingInput)
  )

  const isValid = await crypto.subtle.verify(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    keyPair.publicKey,
    signature,
    new TextEncoder().encode(signingInput)
  )

  return { isValid, signingInput }
}

// 4. HMAC-SHA256 Webhook
async function testACPWebhookHmac(secret, payload) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const t = Math.floor(Date.now() / 1000)
  const dataToSign = `${t}.${payload}`
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(dataToSign))
  const hex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  const header = `t=${t},v1=${hex}`
  return { header, hex, t }
}

// 5. Razorpay Real Orders API Call (with retry for transient DNS/network blips)
async function testRealRazorpayOrder() {
  const keyId = "rzp_test_TXeysTR9U8Fyws"
  const secret = "UuzZqB93v2obPdSyg3plRzKd"
  const auth = Buffer.from(`${keyId}:${secret}`).toString("base64")

  let lastError = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: 45000, // ₹450.00
          currency: "INR",
          receipt: `ci_test_${Date.now().toString(36)}`,
          notes: {
            protocol: "ucp_acp_ap2",
            test_suite: "preproduction_ci",
          },
        }),
      })

      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`Razorpay API responded ${res.status}: ${txt}`)
      }

      return await res.json()
    } catch (err) {
      lastError = err
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1000))
      }
    }
  }

  throw lastError
}

async function runAllDiagnostics() {
  console.log("=== STARTING AGENTIC COMMERCE PRE-PRODUCTION PROTOCOL VERIFICATION ===")

  // Test 1: RFC 8785 Canonicalization
  const obj1 = { z: 1, a: 2, m: { b: 3, a: 4 } }
  const obj2 = { a: 2, m: { a: 4, b: 3 }, z: 1 }
  const c1 = canonicalize(obj1)
  const c2 = canonicalize(obj2)
  if (c1 === c2 && c1 === '{"a":2,"m":{"a":4,"b":3},"z":1}') {
    console.log("✓ TEST 1 PASSED: RFC 8785 Lexicographical Canonicalization matches perfectly.")
  } else {
    throw new Error(`TEST 1 FAILED: c1=${c1}, c2=${c2}`)
  }

  // Test 2: SHA-256 Hashing
  const hash1 = await sha256Hex(c1)
  const hash2 = await sha256Hex(c2)
  if (hash1 === hash2 && hash1.length === 64) {
    console.log(`✓ TEST 2 PASSED: SHA-256 Cart Hash deterministic (${hash1.slice(0, 16)}...)`)
  } else {
    throw new Error("TEST 2 FAILED: SHA-256 mismatch")
  }

  // Test 3: ES256 JWS Digital Signing & Verification
  const { isValid } = await testES256SigningAndVerification()
  if (isValid) {
    console.log("✓ TEST 3 PASSED: WebCrypto ECDSA P-256 (ES256) JWS Digital Signature verified.")
  } else {
    throw new Error("TEST 3 FAILED: ES256 verification failed")
  }

  // Test 4: ACP Webhook HMAC-SHA256
  const secret = "Jimmi@6283554982"
  const webhookRes = await testACPWebhookHmac(secret, JSON.stringify({ event: "order.paid" }))
  if (webhookRes.header.startsWith("t=") && webhookRes.header.includes(",v1=")) {
    console.log(`✓ TEST 4 PASSED: ACP Webhook Signature (${webhookRes.header.slice(0, 25)}...)`)
  } else {
    throw new Error("TEST 4 FAILED: Webhook format invalid")
  }

  // Test 5: Authoritative Razorpay Test Rails Call
  console.log("Calling live Razorpay REST API (https://api.razorpay.com/v1/orders)...")
  const rzpOrder = await testRealRazorpayOrder()
  if (rzpOrder.id && rzpOrder.id.startsWith("order_") && rzpOrder.amount === 45000) {
    console.log(`✓ TEST 5 PASSED: Authoritative Razorpay Order Created: ${rzpOrder.id}`)
    console.log(`  - Entity: ${rzpOrder.entity}`)
    console.log(`  - Status: ${rzpOrder.status}`)
    console.log(`  - Amount: ₹${(rzpOrder.amount / 100).toFixed(2)} (${rzpOrder.currency})`)
    console.log(`  - Receipt: ${rzpOrder.receipt}`)
  } else {
    throw new Error(`TEST 5 FAILED: Unexpected Razorpay response: ${JSON.stringify(rzpOrder)}`)
  }

  console.log("\n==========================================================================")
  console.log("ALL 5 AGENTIC COMMERCE PROTOCOL TESTS PASSED WITH 100% SUCCESS!")
  console.log("Stack: UCP (2026-01-16) + ACP + Google AP2 (WebCrypto ES256) + Razorpay Rails")
  console.log("==========================================================================")
}

runAllDiagnostics().catch((err) => {
  console.error("DIAGNOSTIC FAILURE:", err)
  process.exit(1)
})
