/**
 * Subdomain detection and routing helpers for the Razent multi-portal architecture.
 *
 * Supports:
 * - Custom domain subdomains (e.g. merchant.yourdomain.com)
 * - Vercel hyphenated project subdomains (e.g. razent-merchant.vercel.app or merchant-razent.vercel.app)
 * - Query parameter fallback (?portal=merchant)
 * - Internal path fallback (/merchant/*)
 */

export function isMerchantSubdomain(): boolean {
  if (typeof window === "undefined") return false

  const hostname = window.location.hostname.toLowerCase()

  // 1. Prefix subdomain: merchant.domain.com or merchant.localhost
  if (hostname.startsWith("merchant.")) {
    return true
  }

  // 2. Vercel project domain alias: razent-merchant.vercel.app or merchant-razent.vercel.app
  if (hostname.endsWith(".vercel.app") && (hostname.includes("-merchant") || hostname.startsWith("merchant-"))) {
    return true
  }

  // 3. Explicit dev / testing fallback: ?portal=merchant
  const searchParams = new URLSearchParams(window.location.search)
  if (searchParams.get("portal") === "merchant") {
    return true
  }

  return false
}

/**
 * Returns the URL for navigating to the merchant console.
 * Uses environment variable override if set (VITE_MERCHANT_URL),
 * or relative paths if on the same host.
 */
export function getMerchantUrl(path = "/dashboard"): string {
  if (typeof window === "undefined") return path

  // Normalize path: strip leading /merchant or /admin prefix
  let normalized = path.replace(/^\/(merchant|admin)(\/|$)/, "/")
  if (!normalized || normalized === "/") {
    normalized = "/dashboard"
  }
  const cleanPath = normalized.startsWith("/") ? normalized : `/${normalized}`

  // If explicit merchant base URL is configured in env (e.g. https://merchant.yourdomain.com)
  if (import.meta.env.VITE_MERCHANT_URL) {
    const base = (import.meta.env.VITE_MERCHANT_URL as string).replace(/\/$/, "")
    return `${base}${cleanPath}`
  }

  // If already on merchant portal, use clean relative path
  if (isMerchantSubdomain()) {
    return cleanPath
  }

  const hostname = window.location.hostname.toLowerCase()

  // Production Vercel domain: razent.vercel.app -> razent-merchant.vercel.app
  if (hostname === "razent.vercel.app" || (hostname.endsWith(".vercel.app") && !hostname.includes("-merchant"))) {
    const merchantHost = hostname.replace(".vercel.app", "-merchant.vercel.app")
    return `${window.location.protocol}//${merchantHost}${cleanPath}`
  }

  // Local development fallback: keep within current host under /merchant
  if (cleanPath === "/signin" || cleanPath === "/sign-in") {
    return "/signin"
  }
  return `/merchant${cleanPath === "/dashboard" ? "/dashboard" : cleanPath}`
}

/**
 * Returns the URL for navigating to the customer storefront.
 */
export function getStorefrontUrl(path = "/"): string {
  if (typeof window === "undefined") return path

  const cleanPath = path.startsWith("/") ? path : `/${path}`

  if (import.meta.env.VITE_STOREFRONT_URL) {
    const base = (import.meta.env.VITE_STOREFRONT_URL as string).replace(/\/$/, "")
    return `${base}${cleanPath}`
  }

  const hostname = window.location.hostname.toLowerCase()

  if (hostname.startsWith("merchant.")) {
    const storefrontHost = hostname.replace(/^merchant\./, "")
    return `${window.location.protocol}//${storefrontHost}${cleanPath}`
  }

  if (hostname.endsWith(".vercel.app") && hostname.includes("-merchant")) {
    const storefrontHost = hostname.replace("-merchant", "")
    return `${window.location.protocol}//${storefrontHost}${cleanPath}`
  }

  return cleanPath
}
