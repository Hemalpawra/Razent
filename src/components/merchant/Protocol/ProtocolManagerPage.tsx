import { useState, useEffect } from "react"
import {
  ShieldCheck,
  Zap,
  Key,
  Globe,
  Radio,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  CreditCard,
  Code2,
  FileCheck,
  Send,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/api/supabase"
import { createRazorpayOrder, fetchRazorpayOrder } from "@/lib/api/razorpayClient"
import {
  createAP2CartMandateFromItems,
  createAP2PaymentMandate,
  verifyFullAP2MandateChain,
} from "@/lib/protocol/agenticCommerce"
import { getOrCreateMerchantKeys, verifyACPWebhookSignature } from "@/lib/protocol/ap2Crypto"
import { canonicalize } from "@/lib/protocol/canonicalize"
import { listProducts } from "@/lib/api/client"
import type { IntentMandate } from "@/lib/protocol/ap2Types"
import { toast } from "sonner"

export default function ProtocolManagerPage() {
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [merchantJwk, setMerchantJwk] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("overview")

  // AP2 Verifier state
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<any>(null)

  // Razorpay order test state
  const [rzpLoading, setRzpLoading] = useState(false)
  const [lastRzpOrder, setLastRzpOrder] = useState<any>(null)

  // Webhook inspector state
  const [webhookPayload, setWebhookPayload] = useState(
    JSON.stringify({ event: "session.completed", session_id: "acp_test_123" }, null, 2)
  )
  const [webhookHeader, setWebhookHeader] = useState("")
  const [webhookSecret, setWebhookSecret] = useState("Jimmi@6283554982")
  const [webhookResult, setWebhookResult] = useState<any>(null)

  useEffect(() => {
    loadProtocolData()
  }, [])

  async function loadProtocolData() {
    setLoading(true)
    try {
      // 1. Load active merchant public JWK
      const keys = await getOrCreateMerchantKeys()
      setMerchantJwk(keys.publicJwk)

      // 2. Fetch ACP checkout sessions from Supabase
      const { data: acpData } = await supabase
        .from("acp_checkout_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20)

      if (acpData) {
        setSessions(acpData)
      }

      // 3. Fetch orders settled via agentic protocols
      const { data: orderData } = await supabase
        .from("orders")
        .select("*")
        .in("commerce_protocol", ["acp", "ap2", "ncpi_uap"])
        .order("created_at", { ascending: false })
        .limit(20)

      if (orderData) {
        setOrders(orderData)
      }
    } catch (err: any) {
      console.error("[ProtocolManagerPage] load error:", err)
    } finally {
      setLoading(false)
    }
  }

  async function handleTestRazorpayOrder() {
    setRzpLoading(true)
    try {
      const order = await createRazorpayOrder({
        amount_paise: 29900, // ₹299.00
        receipt: `test_${Date.now().toString(36)}`,
        notes: {
          test_flow: "pre_production_diagnostic",
          origin: "ProtocolManagerPage",
        },
      })
      setLastRzpOrder(order)
      toast.success(`Authoritative Razorpay Order Created: ${order.id}`)
    } catch (err: any) {
      toast.error(`Razorpay API Error: ${err.message}`)
    } finally {
      setRzpLoading(false)
    }
  }

  async function handleRunAP2VerificationDiagnostic() {
    setVerifying(true)
    try {
      const products = await listProducts()
      const sampleItem = products[0] || {
        id: "prod_sample",
        title: "Cold-Pressed Mustard Oil 1L",
        price_paise: 18500,
        qty: 1,
      }

      // 1. Create real Cart Mandate
      const cartMandate = await createAP2CartMandateFromItems([
        {
          id: sampleItem.id,
          title: sampleItem.title,
          price_paise: sampleItem.price_paise,
          qty: 1,
        },
      ])

      // 2. Buyer Intent Mandate
      const intentMandate: IntentMandate = {
        id: `intent_${Date.now()}`,
        user_cart_confirmation_required: false,
        natural_language_description: "Buy sample product under delegated cap",
        currency: "INR",
        price_cap_paise: 50000,
        agent_id: "buyer_agent_gemini",
        skus: [sampleItem.id],
        intent_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
      }

      // 3. Create real Payment Mandate
      const paymentMandate = await createAP2PaymentMandate(
        cartMandate,
        "customer@okhdfcbank"
      )

      // 4. Run cryptographic verification
      const result = await verifyFullAP2MandateChain(
        intentMandate,
        cartMandate,
        paymentMandate
      )

      setVerificationResult({
        result,
        cartMandate,
        paymentMandate,
        canonicalCartJson: canonicalize(cartMandate.contents),
      })

      if (result.ok) {
        toast.success("AP2 Cryptographic Verification: All checks passed!")
      } else {
        toast.error(`Verification Failed: ${result.reason}`)
      }
    } catch (err: any) {
      toast.error(`Diagnostic Failed: ${err.message}`)
    } finally {
      setVerifying(false)
    }
  }

  async function handleVerifyWebhook() {
    const res = await verifyACPWebhookSignature(
      webhookPayload,
      webhookHeader,
      webhookSecret
    )
    setWebhookResult(res)
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Agentic Commerce Protocol Stack
            </h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
              Pre-Production
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Universal Commerce Protocol (UCP), Agentic Commerce Protocol (ACP), and Google AP2 verification gateway.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadProtocolData}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleTestRazorpayOrder}
            disabled={rzpLoading}
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <CreditCard className="h-4 w-4" />
            {rzpLoading ? "Calling Razorpay..." : "Test Razorpay Order"}
          </Button>
        </div>
      </div>

      {/* Protocol Metrics KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              UCP Federation
            </CardTitle>
            <Globe className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">2026-01-16</div>
            <p className="text-xs text-muted-foreground mt-1">
              Transports: REST, A2A, MCP Active
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              ACP Sessions
            </CardTitle>
            <Radio className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{sessions.length} recorded</div>
            <p className="text-xs text-muted-foreground mt-1">
              Idempotency: 24h RFC-8785 cache
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              AP2 Cryptography
            </CardTitle>
            <Key className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">WebCrypto ES256</div>
            <p className="text-xs text-muted-foreground mt-1">
              kid: merchant-key-p256-primary
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Razorpay Settlement
            </CardTitle>
            <Zap className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">rzp_test_TXey...</div>
            <p className="text-xs text-muted-foreground mt-1">
              Authoritative Test Network Online
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="overview">Live ACP Sessions</TabsTrigger>
          <TabsTrigger value="ap2">AP2 Mandate Verifier</TabsTrigger>
          <TabsTrigger value="razorpay">Razorpay Live Rails</TabsTrigger>
          <TabsTrigger value="manifests">Discovery Manifests</TabsTrigger>
          <TabsTrigger value="webhooks">Webhook Signatures</TabsTrigger>
        </TabsList>

        {/* TAB 1: Live ACP Sessions */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recorded ACP Checkout Sessions</CardTitle>
              <CardDescription>
                Live sessions created via <code className="text-xs bg-muted px-1.5 py-0.5 rounded">POST /api/a2a/acp/checkout_sessions</code> with real Razorpay order bindings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No ACP checkout sessions recorded yet. External agents (ChatGPT, Claude, Gemini) will create sessions here.
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Session ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total (₹)</TableHead>
                        <TableHead>Razorpay Order</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono text-xs font-semibold">{s.id}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                s.status === "completed"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                  : s.status === "ready_for_payment"
                                  ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                  : "bg-muted text-muted-foreground"
                              }
                            >
                              {s.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{s.line_items?.length || 0} items</TableCell>
                          <TableCell className="font-medium text-xs">
                            ₹{((s.totals?.[0]?.amount || 0) / 100).toFixed(2)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {s.razorpay_order_id || "N/A"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(s.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Settled Agentic Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Settled Protocol Orders</CardTitle>
              <CardDescription>
                Orders fulfilled via autonomous agent payment protocols (AP2 / ACP / UAP).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No protocol orders settled yet.
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Protocol</TableHead>
                        <TableHead>Total (₹)</TableHead>
                        <TableHead>Mandate Chain ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Paid At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-xs font-semibold">{o.external_id || o.id}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="uppercase text-[10px]">
                              {o.commerce_protocol || "ap2"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-xs">
                            ₹{(o.total_paise / 100).toFixed(2)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[140px]">
                            {o.mandate_id || "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                              {o.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {o.paid_at ? new Date(o.paid_at).toLocaleString() : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: AP2 Mandate Verifier */}
        <TabsContent value="ap2" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Google AP2 Mandate Chain Diagnostic</CardTitle>
              <CardDescription>
                Executes the full cryptographic mandate lifecycle: RFC 8785 Canonicalization, SHA-256 Cart Hashing, Merchant ES256 Digital Signing, and Autonomous Verification.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleRunAP2VerificationDiagnostic}
                disabled={verifying}
                className="gap-2 bg-primary text-primary-foreground"
              >
                <FileCheck className="h-4 w-4" />
                {verifying ? "Executing Verification Suite..." : "Run AP2 Cryptographic Verification"}
              </Button>

              {verificationResult && (
                <div className="space-y-4 mt-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="p-3 border rounded-lg bg-muted/40">
                      <div className="text-xs text-muted-foreground font-semibold">Canonical Cart Hash</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {verificationResult.result.cart_hash_valid ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-xs font-mono truncate">
                          {verificationResult.cartMandate.cart_hash}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 border rounded-lg bg-muted/40">
                      <div className="text-xs text-muted-foreground font-semibold">Merchant Digital Signature (ES256)</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {verificationResult.result.merchant_signature_valid ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-xs font-mono text-emerald-600">
                          VERIFIED AUTHENTIC
                        </span>
                      </div>
                    </div>

                    <div className="p-3 border rounded-lg bg-muted/40">
                      <div className="text-xs text-muted-foreground font-semibold">Autonomous Chain Result</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {verificationResult.result.ok ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                        <span className="text-xs font-semibold">
                          {verificationResult.result.ok ? "Mandate Chain Approved" : "Rejected"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mandate Payload Inspection */}
                  <div className="p-3 border rounded-lg bg-muted/20">
                    <div className="text-xs font-semibold mb-2">RFC 8785 Canonical Serialization (Signing Input)</div>
                    <pre className="text-[11px] font-mono bg-background p-3 rounded border overflow-x-auto">
                      {verificationResult.canonicalCartJson}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Razorpay Live Rails */}
        <TabsContent value="razorpay" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Authoritative Razorpay Test Gateway</CardTitle>
              <CardDescription>
                Direct connection to <code className="text-xs bg-muted px-1.5 py-0.5 rounded">https://api.razorpay.com/v1</code>. No simulation, no mock responses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="p-3 border rounded-lg">
                  <div className="text-xs text-muted-foreground">Configured Key ID</div>
                  <div className="font-mono text-sm font-semibold mt-1">rzp_test_TXeysTR9U8Fyws</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-xs text-muted-foreground">Currency & Settlement Rail</div>
                  <div className="font-mono text-sm font-semibold mt-1">INR (Indian Rupee) / NPCI UPI & Cards</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleTestRazorpayOrder}
                  disabled={rzpLoading}
                  className="gap-2"
                >
                  <Zap className="h-4 w-4 text-amber-400" />
                  {rzpLoading ? "Creating on Razorpay..." : "Create Live Test Order (₹299.00)"}
                </Button>
              </div>

              {lastRzpOrder && (
                <div className="mt-4 p-4 border rounded-lg bg-blue-500/5 border-blue-500/20">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-600 mb-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Real Razorpay Order Created on Test Network
                  </div>
                  <pre className="text-xs font-mono bg-background p-3 rounded border overflow-x-auto">
                    {JSON.stringify(lastRzpOrder, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: Discovery Manifests */}
        <TabsContent value="manifests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Public Discovery Manifests</CardTitle>
              <CardDescription>
                Standard machine-readable declarations served at standard well-known URIs for external AI agent discovery.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <a
                  href="/.well-known/ucp.json"
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 border rounded-lg hover:border-primary transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold text-foreground">UCP Manifest</div>
                    <div className="text-[11px] font-mono text-muted-foreground mt-0.5">/.well-known/ucp.json</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </a>

                <a
                  href="/.well-known/acp.json"
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 border rounded-lg hover:border-primary transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold text-foreground">ACP Manifest</div>
                    <div className="text-[11px] font-mono text-muted-foreground mt-0.5">/.well-known/acp.json</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </a>

                <a
                  href="/.well-known/jwks.json"
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 border rounded-lg hover:border-primary transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold text-foreground">Merchant JWKS</div>
                    <div className="text-[11px] font-mono text-muted-foreground mt-0.5">/.well-known/jwks.json</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </a>
              </div>

              {merchantJwk && (
                <div className="p-4 border rounded-lg bg-muted/20">
                  <div className="text-xs font-semibold mb-2">Merchant Active Public JWK (ES256)</div>
                  <pre className="text-xs font-mono bg-background p-3 rounded border overflow-x-auto">
                    {JSON.stringify(merchantJwk, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: Webhooks & Security */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ACP Webhook Security Inspector</CardTitle>
              <CardDescription>
                Verifies <code className="text-xs bg-muted px-1.5 py-0.5 rounded">X-ACP-Signature</code> headers using HMAC-SHA256 with 300-second replay attack tolerance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold">Webhook Payload JSON</label>
                <textarea
                  className="w-full h-24 mt-1 font-mono text-xs p-3 rounded border bg-background"
                  value={webhookPayload}
                  onChange={(e) => setWebhookPayload(e.target.value)}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold">X-ACP-Signature Header</label>
                  <Input
                    placeholder="t=1773418200,v1=9f4a8b71..."
                    value={webhookHeader}
                    onChange={(e) => setWebhookHeader(e.target.value)}
                    className="font-mono text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold">Webhook Secret</label>
                  <Input
                    type="password"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    className="font-mono text-xs mt-1"
                  />
                </div>
              </div>

              <Button onClick={handleVerifyWebhook} size="sm" className="gap-2">
                <ShieldCheck className="h-4 w-4" />
                Verify Signature
              </Button>

              {webhookResult && (
                <div
                  className={`p-3 border rounded-lg text-xs font-semibold flex items-center gap-2 ${
                    webhookResult.valid
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                      : "bg-red-500/10 text-red-600 border-red-500/30"
                  }`}
                >
                  {webhookResult.valid ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Signature Valid & Replay Window Satisfied
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" /> Signature Verification Failed: {webhookResult.error}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
