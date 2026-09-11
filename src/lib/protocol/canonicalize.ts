/**
 * RFC 8785 — JSON Canonicalization Scheme (JCS)
 * Specification: https://datatracker.ietf.org/doc/html/rfc8785
 *
 * Guarantees identical canonical byte representation for any JSON object across
 * heterogeneous platforms (Node.js, Deno, browsers, Python, Go) for cryptographic
 * SHA-256 hashing and digital signature verification.
 */

export function canonicalize(data: unknown): string {
  if (data === null || typeof data !== "object") {
    // Primitive types: number, string, boolean, null
    return JSON.stringify(data)
  }

  if (Array.isArray(data)) {
    const items = data.map((item) => (item === undefined ? "null" : canonicalize(item)))
    return `[${items.join(",")}]`
  }

  // Object handling: keys must be sorted strictly by UTF-16 code units
  const obj = data as Record<string, unknown>
  const keys = Object.keys(obj).sort((a, b) => {
    return a < b ? -1 : a > b ? 1 : 0
  })

  const entries: string[] = []
  for (const key of keys) {
    const value = obj[key]
    // In standard JSON, undefined properties are omitted from objects
    if (value !== undefined && typeof value !== "function" && typeof value !== "symbol") {
      entries.push(`${JSON.stringify(key)}:${canonicalize(value)}`)
    }
  }

  return `{${entries.join(",")}}`
}
