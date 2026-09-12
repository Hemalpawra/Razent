export const config = {
  runtime: 'edge',
}

const UPSTREAM_MCP_URL = 'https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/mcp'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, mcp-session-id, x-acp-signature, mcp-protocol-version, mcp-method, mcp-name, traceparent, tracestate, baggage',
  'Access-Control-Expose-Headers': 'mcp-protocol-version, mcp-session-id',
}

export default async function handler(req: Request) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  const url = new URL(req.url)
  const targetUrl = new URL(UPSTREAM_MCP_URL)

  // Forward any query parameters
  url.searchParams.forEach((val, key) => {
    targetUrl.searchParams.set(key, val)
  })

  // Clone headers and forward to upstream Supabase Edge Function
  const forwardHeaders = new Headers(req.headers)
  forwardHeaders.delete('host')
  forwardHeaders.set('X-Forwarded-Host', url.host)
  forwardHeaders.set('X-Forwarded-Proto', url.protocol.replace(':', ''))

  try {
    const upstreamResponse = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: forwardHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      redirect: 'follow',
    })

    // Create a new response with upstream body and merged CORS headers
    const responseHeaders = new Headers(upstreamResponse.headers)
    for (const [key, value] of Object.entries(corsHeaders)) {
      responseHeaders.set(key, value)
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    })
  } catch (err: any) {
    console.error('MCP Gateway proxy error:', err)
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: `Gateway proxy error: ${err?.message || 'Failed to reach upstream MCP engine'}`,
        },
      }),
      {
        status: 502,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
}
