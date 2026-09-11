export const config = {
  runtime: 'edge',
}

export default async function handler(req: Request) {
  const url = new URL(req.url)

  // Extract path passed from vercel.json rewrite
  const pathParam = url.searchParams.get('path') || ''
  const cleanPath = pathParam.startsWith('/') ? pathParam : `/${pathParam}`

  const targetUrl = new URL(cleanPath, 'https://frontend-api.clerk.dev')
  
  // Forward query parameters
  url.searchParams.forEach((value, key) => {
    if (key !== 'path') {
      targetUrl.searchParams.set(key, value)
    }
  })

  const secretKey = process.env.CLERK_SECRET_KEY || ''
  const proxyUrl = process.env.VITE_CLERK_PROXY_URL || `${url.origin}/__clerk`

  const headers = new Headers(req.headers)
  headers.set('Clerk-Proxy-Url', proxyUrl)
  if (secretKey) {
    headers.set('Clerk-Secret-Key', secretKey)
  }
  headers.set('X-Forwarded-Host', url.host)
  headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''))

  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''
  if (clientIp) {
    headers.set('X-Forwarded-For', clientIp)
  }

  // Remove host so TLS and SNI match frontend-api.clerk.dev
  headers.delete('host')

  try {
    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      redirect: 'manual',
    })

    return response
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Proxy error' }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    })
  }
}
