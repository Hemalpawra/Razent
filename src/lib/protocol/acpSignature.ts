/**
 * ACP Webhook & Request Signature Verification
 * Aligned with ACP 2026-01-16 / 2026-04-17 Specifications
 *
 * Header: X-ACP-Signature: t={timestamp},v1={hmac_sha256}
 * Scheme: HMAC-SHA256(secret, "${t}.${rawBody}")
 * Replay Defense: 300-second maximum drift window
 */

import { hmacSha256Hex, verifyACPWebhookSignature } from "./ap2Crypto"

export async function createACPWebhookSignature(
  rawBody: string,
  secret: string,
  timestamp = Math.floor(Date.now() / 1000),
): Promise<{ header: string; timestamp: number; signature: string }> {
  const signature = await hmacSha256Hex(`${timestamp}.${rawBody}`, secret)
  const header = `t=${timestamp},v1=${signature}`
  return { header, timestamp, signature }
}

export { verifyACPWebhookSignature }
