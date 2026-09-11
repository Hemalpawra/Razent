/**
 * Subdomain detection and routing helpers for the Razent multi-portal architecture.
 *
 * Separates the customer Storefront (razent.vercel.app) from the
 * Merchant Operations Console (merchant.razent.vercel.app).
 */

export function isMerchantSubdomain(): boolean {
  if (typeof window === "undefined") return false

  const hostname = window.location.hostname.toLowerCase()
  if (hostname.startsWith("merchant.")) {
    return true
  }

  // Local development fallback via query param: ?portal=merchant
  const searchParams = new URLSearchParams(window.location.search)
  if (searchParams.get("portal") === "merchant") {
    return true
  }

  return false
}

/**
 * Returns the URL for navigating to the merchant console.
 * In production on main domain, directs to https://merchant.razent.vercel.app.
 * In local dev or when already on the merchant subdomain, uses internal paths.
 */
export function getMerchantUrl(path = "/dashboard"): string {
  if (typeof window === "undefined") return path

  const cleanPath = path.startsWith("/") ? path : `/${path}`
  const hostname = window.location.hostname.toLowerCase()

  if (hostname.startsWith("merchant.")) {
    return cleanPath
  }

  // Production Vercel domain
  if (hostname === "razent.vercel.app" || hostname.endsWith(".vercel.app")) {
    const parts = hostname.split(".")
    // If not already merchant, prepend merchant
    if (parts[0] !== "merchant") {
      const merchantHost = `merchant.${hostname}`
      return `${window.location.protocol}//${merchantHost}${cleanPath}`
    }
  }

  // Local development: keep within current host using /merchant prefix or ?portal=merchant
  return `/merchant${cleanPath === "/dashboard" ? "/dashboard" : cleanPath}`
}

/**
 * Returns the URL for navigating to the customer storefront.
 */
export function getStorefrontUrl(path = "/"): string {
  if (typeof window === "undefined") return path

  const cleanPath = path.startsWith("/") ? path : `/${path}`
  const hostname = window.location.hostname.toLowerCase()

  if (hostname.startsWith("merchant.")) {
    const storefrontHost = hostname.replace(/^merchant\./, "")
    return `${window.location.protocol}//${storefrontHost}${cleanPath}`
  }

  return cleanPath
}
