/**
 * WebCrypto Cryptographic Implementation for Google AP2, ACP, and Razorpay
 *
 * Implements:
 * 1. RFC 7515 Base64URL encoding/decoding
 * 2. SHA-256 cryptographic hashing for CartMandates and payload checksums
 * 3. Asymmetric JWS signing and verification (ECDSA P-256 / ES256 & RS256)
 * 4. HMAC-SHA256 constant-time verification for Razorpay payments and ACP Webhooks
 */

import { canonicalize } from "./canonicalize"

// ============================================================================
// 1. BASE64URL ENCODING & DECODING (RFC 7515)
// ============================================================================

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

export function base64UrlDecode(base64Url: string): Uint8Array {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
  while (base64.length % 4 !== 0) {
    base64 += "="
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function stringToBase64Url(str: string): string {
  const enc = new TextEncoder()
  return base64UrlEncode(enc.encode(str))
}

export function base64UrlToString(base64Url: string): string {
  const dec = new TextDecoder()
  return dec.decode(base64UrlDecode(base64Url))
}

// ============================================================================
// 2. CRYPTOGRAPHIC SHA-256 HASHING
// ============================================================================

export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes as unknown as BufferSource)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

export async function computeCanonicalCartHash(cartContents: unknown): Promise<{ canonicalJson: string; cartHash: string }> {
  const canonicalJson = canonicalize(cartContents)
  const cartHash = await sha256Hex(canonicalJson)
  return { canonicalJson, cartHash }
}

// ============================================================================
// 3. ASYMMETRIC JWS SIGNING & VERIFICATION (ECDSA P-256 / ES256)
// ============================================================================

export interface MerchantCryptoKeys {
  privateKey: CryptoKey
  publicKey: CryptoKey
  publicJwk: JsonWebKey & { kid?: string }
}

let cachedMerchantKeys: MerchantCryptoKeys | null = null

/**
 * Generates or retrieves the active Merchant ECDSA P-256 cryptographic keypair.
 * Complies with WebCrypto API standards.
 */
export async function getOrCreateMerchantKeys(): Promise<MerchantCryptoKeys> {
  if (cachedMerchantKeys) return cachedMerchantKeys

  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true, // extractable
    ["sign", "verify"],
  )

  const publicJwk = (await crypto.subtle.exportKey("jwk", keyPair.publicKey)) as JsonWebKey & {
    kid?: string
  }
  publicJwk.kid = "merchant-key-p256-primary"
  publicJwk.use = "sig"
  publicJwk.alg = "ES256"

  cachedMerchantKeys = {
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    publicJwk,
  }

  return cachedMerchantKeys
}

/**
 * Digitally signs a JSON payload as an RFC 7515 JWS (Compact Serialization).
 */
export async function signJWS(
  payload: Record<string, unknown>,
  privateKey: CryptoKey,
  kid = "merchant-key-p256-primary",
): Promise<string> {
  const header = {
    alg: "ES256",
    typ: "JWT",
    kid,
  }

  const encodedHeader = stringToBase64Url(JSON.stringify(header))
  const encodedPayload = stringToBase64Url(canonicalize(payload))
  const signingInput = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)

  const signatureBuffer = await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    },
    privateKey,
    signingInput,
  )

  const encodedSignature = base64UrlEncode(new Uint8Array(signatureBuffer))
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`
}

/**
 * Cryptographically verifies an RFC 7515 JWS using a public key.
 */
export async function verifyJWS<T = Record<string, unknown>>(
  jws: string,
  publicKey: CryptoKey,
): Promise<{ valid: boolean; payload?: T; error?: string }> {
  const parts = jws.split(".")
  if (parts.length !== 3) {
    return { valid: false, error: "Malformed JWS format (expected 3 parts)" }
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts

  try {
    const signingInput = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
    const signatureBytes = base64UrlDecode(encodedSignature)

    const isValid = await crypto.subtle.verify(
      {
        name: "ECDSA",
        hash: { name: "SHA-256" },
      },
      publicKey,
      signatureBytes as unknown as BufferSource,
      signingInput as unknown as BufferSource,
    )

    if (!isValid) {
      return { valid: false, error: "Cryptographic signature mismatch" }
    }

    const payloadJson = base64UrlToString(encodedPayload)
    const payload = JSON.parse(payloadJson) as T
    return { valid: true, payload }
  } catch (err: any) {
    return { valid: false, error: err?.message || "Verification failed" }
  }
}

// ============================================================================
// 4. CONSTANT-TIME TIMING-SAFE HMAC-SHA256 UTILITIES
// ============================================================================

export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let c = 0
  for (let i = 0; i < a.length; i++) {
    c |= a[i] ^ b[i]
  }
  return c === 0
}

/**
 * Computes HMAC-SHA256 hex string.
 */
export async function hmacSha256Hex(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(data))
  const sigArray = Array.from(new Uint8Array(sigBuffer))
  return sigArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

/**
 * Real Razorpay Payment Signature Verification.
 * Specification: HMAC-SHA256(order_id + "|" + payment_id, secret) == signature
 */
export async function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!orderId || !paymentId || !signature || !secret) return false
  const expectedHex = await hmacSha256Hex(`${orderId}|${paymentId}`, secret)
  const enc = new TextEncoder()
  return timingSafeEqual(enc.encode(expectedHex), enc.encode(signature.trim()))
}

/**
 * Real ACP Webhook Signature Verification.
 * Header format: X-ACP-Signature: t=1773418200,v1=9f4a8b71...
 * Algorithm: HMAC-SHA256(secret, "${t}.${rawBody}")
 */
export async function verifyACPWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  maxDriftSec = 300,
): Promise<{ valid: boolean; error?: string }> {
  if (!signatureHeader || !secret) {
    return { valid: false, error: "Missing signature header or secret" }
  }

  const parts = signatureHeader.split(",")
  let t = 0
  let v1 = ""
  for (const part of parts) {
    const [k, v] = part.trim().split("=")
    if (k === "t") t = parseInt(v, 10)
    if (k === "v1") v1 = v
  }

  if (!t || !v1) {
    return { valid: false, error: "Malformed X-ACP-Signature header" }
  }

  const nowSec = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSec - t) > maxDriftSec) {
    return { valid: false, error: "Timestamp exceeds allowed 300-second replay window" }
  }

  const expectedHex = await hmacSha256Hex(`${t}.${rawBody}`, secret)
  const enc = new TextEncoder()
  const isMatch = timingSafeEqual(enc.encode(expectedHex), enc.encode(v1))

  return {
    valid: isMatch,
    error: isMatch ? undefined : "HMAC signature mismatch",
  }
}
