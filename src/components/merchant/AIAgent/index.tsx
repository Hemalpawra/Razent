import { Users, ShoppingCart, IndianRupee, MessageCircle, TrendingUp, Package, Lightbulb, AlertTriangle, Eye, ChevronDown, Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatPrice } from "@/lib/types/product"
import { mockConversations } from "@/lib/mock/conversations"
import { mockOrders } from "@/lib/mock/orders"
import type { ConversationStatus } from "@/lib/types/conversation"
import { useState } from "react"
import ConversationDrawer from "@/components/merchant/AIAgent/ConversationDrawer"

const statusVariant: Record<ConversationStatus, "success" | "secondary" | "warning" | "destructive" | "default"> = {
  active: "default",
  waiting_for_customer: "warning",
  waiting_for_payment: "warning",
  checkout_ready: "secondary",
  paid: "success",
  completed: "success",
  failed: "destructive",
  cancelled: "secondary",
}

const statusLabel: Record<ConversationStatus, string> = {
  active: "Active",
  waiting_for_customer: "Waiting for Customer",
  waiting_for_payment: "Waiting for Payment",
  checkout_ready: "Checkout Ready",
  paid: "Paid",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
}

function sourceLabel(type: string) {
  return type === "agent_to_agent" ? "AI Agent" : "AI Assistant"
}

export default function AIAgentScreen({ loading, error }: { loading?: boolean; error?: string | null }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const selected = openId ? mockConversations.find((c) => c.id === openId) ?? null : null
  const activeCount = mockConversations.filter((c) => c.status === "active" || c.status === "waiting_for_customer" || c.status === "waiting_for_payment").length
  const ordersToday = mockOrders.filter((o) => o.created_at.startsWith("2026-08-31")).length
  const revenueToday = mockOrders.filter((o) => o.status === "paid" && o.created_at.startsWith("2026-08-31")).reduce((s, o) => s + o.total_paise, 0)
  const customersHelped = 42
  const conversionRate = "24.5%"

  if (loading) {
    return (
      <div className="space-y-4 bg-muted/30 -m-6 p-6">
        <div className="flex justify-between"><Skeleton className="h-10 w-64" /><Skeleton className="h-9 w-32" /></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-muted/30 -m-6 p-6">
        <Card className="rounded-xl bg-card p-10 text-center">
          <p className="text-sm font-medium text-destructive">Failed to load AI Agent</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          <Button className="mt-4" onClick={() => location.reload()}>Retry</Button>
        </Card>
      </div>
    )
  }

  const empty = mockConversations.length === 0

  if (empty) {
    return (
      <div className="bg-muted/30 -m-6 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-heading text-[32px] font-semibold leading-[38px] tracking-tight text-foreground">AI Agent</h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Monitor how your AI helps customers and drives more sales.</p>
          </div>
        </div>
        <Card className="mt-6 rounded-xl bg-card p-10 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"><MessageCircle className="size-6" /></div>
          <h3 className="mt-4 text-base font-semibold text-foreground">No conversations yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Your AI will appear here once products are imported and customers start chatting. Import products to get started.</p>
          <div className="mt-6 flex justify-center gap-2"><Button>Go to Products</Button><Button variant="outline">Product Import</Button></div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 bg-muted/30 -m-6 p-6">
      {/* Header — with date filter + export, no View Audit Trail */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-heading text-[32px] font-semibold leading-[38px] tracking-tight text-foreground">AI Agent</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Monitor how your AI helps customers and drives more sales.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="h-9 rounded-lg bg-card">May 20, 2025 - May 27, 2025<ChevronDown className="size-4 opacity-60" /></Button>
          <Button variant="outline" className="h-9 rounded-lg bg-card"><Download className="size-4" />Export</Button>
          <Button className="h-9 rounded-lg">Test AI</Button>
          <div className="hidden items-center gap-3 pl-2 lg:flex">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">MS</div>
            <div className="leading-none"><div className="text-xs font-bold text-foreground">Merchant Store</div><div className="text-[11px] text-muted-foreground">Super Admin</div></div>
            <span className="text-xs text-muted-foreground">⌄</span>
          </div>
        </div>
      </div>

      {/* KPI — 5 cards (AI Status removed, Customers helped + Conversion added) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard icon={<Users className="size-4" />} label="Customers Helped" value={String(customersHelped)} sub="today · 98% without handoff" />
        <KpiCard icon={<TrendingUp className="size-4" />} label="Conversion Rate" value={conversionRate} sub="↑ 5.3% vs yesterday" />
        <KpiCard icon={<MessageCircle className="size-4" />} label="Active Conversations" value={String(activeCount)} sub="Waiting or active now" />
        <KpiCard icon={<ShoppingCart className="size-4" />} label="Orders Created Today" value={String(ordersToday)} sub="Via AI conversations" />
        <KpiCard icon={<IndianRupee className="size-4" />} label="Revenue Generated Today" value={formatPrice(revenueToday || 12456000)} sub="From AI-assisted orders" valueIsAmount />
      </div>

      {/* 70/30 Grid: Left AI conversation, Right bundle + missed + needs attention */}
      <div className="grid gap-4 lg:grid-cols-[70%_30%]">
        {/* Left — AI Conversation / Live Conversations */}
        <Card className="overflow-hidden rounded-xl bg-card py-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3">
            <div><CardTitle className="text-base">Live Conversations</CardTitle><CardDescription className="text-xs">Latest 5 · AI Assistant + AI Agent</CardDescription></div>
            <Badge variant="secondary" className="rounded-full text-[11px]">5 of {mockConversations.length}</Badge>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-10 px-4 text-xs font-semibold text-foreground">Customer / Agent</TableHead>
                  <TableHead className="h-10 px-3 text-xs font-semibold text-foreground">Source</TableHead>
                  <TableHead className="h-10 px-3 text-xs font-semibold text-foreground">Status</TableHead>
                  <TableHead className="h-10 px-3 text-right text-xs font-semibold text-foreground">Amount</TableHead>
                  <TableHead className="h-10 px-3 text-xs font-semibold text-foreground hidden lg:table-cell">Last updated</TableHead>
                  <TableHead className="h-10 px-4 text-right text-xs font-semibold text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockConversations.slice(0, 5).map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/20">
                    <TableCell className="px-4 py-3">
                      <div className="text-sm font-medium text-foreground">{c.customer_name}</div>
                      <div className="max-w-[18rem] truncate text-xs text-muted-foreground">{c.last_message}</div>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <Badge variant={c.type === "agent_to_agent" ? "default" : "secondary"} className="rounded-full text-[11px]">{sourceLabel(c.type)}</Badge>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <Badge variant={statusVariant[c.status]} className="rounded-full px-2.5 py-0 text-[11px]">{statusLabel[c.status]}</Badge>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right text-sm font-medium tabular-nums text-foreground">{c.amount_paise ? formatPrice(c.amount_paise) : "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell px-3 py-3 text-xs text-muted-foreground">{new Date(c.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {new Date(c.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" className="h-7 rounded-md bg-card" onClick={() => setOpenId(c.id)}><Eye className="size-3.5" /> Open</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between border-t bg-card px-4 py-3 text-xs text-muted-foreground"><span>Showing 5 of {mockConversations.length} conversations</span><Button variant="outline" size="sm" className="h-7 rounded-full bg-card" onClick={() => setOpenId(mockConversations[0].id)}>Open latest</Button></div>
        </Card>

        {/* Right — 30% stack: Bundle + Missed + Needs Attention */}
        <div className="space-y-4">
          <Card className="rounded-xl bg-card border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2"><div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary"><Lightbulb className="size-4" /></div><CardTitle className="text-sm">Bundle opportunity</CardTitle><Badge variant="secondary" className="ml-auto rounded-full">₹42k potential</Badge></div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-5 text-muted-foreground">Customers who bought Air Purifier Pro also bought Smart Bulb 4-pack. Bundle recommendations increased revenue by <span className="font-medium text-foreground">18%</span> this week.</p>
              <Button size="sm" className="mt-3 h-8 rounded-full">Create bundle</Button>
            </CardContent>
          </Card>
          <Card className="rounded-xl bg-card border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2"><div className="flex size-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-600"><TrendingUp className="size-4" /></div><CardTitle className="text-sm">Missed revenue</CardTitle><Badge variant="secondary" className="ml-auto rounded-full">Kitchen</Badge></div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-5 text-muted-foreground">Kitchen category had 4 chats for out-of-stock kettle. Premium suggestion (Espresso Machine) converted 2/4.</p>
              <Button size="sm" variant="outline" className="mt-3 h-8 rounded-full bg-card">View products</Button>
            </CardContent>
          </Card>
          <Card className="rounded-xl bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">Needs Attention</CardTitle>
              <Badge variant="secondary" className="rounded-full text-[11px]">{activeCount} open</Badge>
            </CardHeader>
            <CardContent className="space-y-1">
              <AttentionRow icon={AlertTriangle} title="Waiting for payment" desc="1 conversation · ₹8,999 at risk" count="1" tone="warning" />
              <AttentionRow icon={Users} title="Human support requested" desc="Priya Nair asked for help" count="1" tone="warning" />
              <AttentionRow icon={Package} title="Out of stock" desc="Smart Kettle — 1 chat affected" count="1" tone="destructive" />
              <AttentionRow icon={TrendingUp} title="Abandoned high-value" desc="₹15,999 bundle stalled" count="1" tone="warning" />
            </CardContent>
          </Card>
        </div>
      </div>

      <ConversationDrawer open={openId !== null} onClose={() => setOpenId(null)} conversation={selected} />
    </div>
  )
}

function KpiCard({ icon, label, value, sub, valueIsAmount }: { icon: React.ReactNode; label: string; value: string; sub: string; valueIsAmount?: boolean }) {
  return (
    <Card className="rounded-xl bg-card p-5 shadow-sm py-5">
      <div className="flex gap-3">
        <div className="hidden size-11 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary sm:flex">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium leading-5 text-muted-foreground">{label}</div>
          <div className={valueIsAmount ? "mt-0.5 text-lg font-semibold leading-6 text-foreground" : "mt-0.5 font-heading text-[22px] font-semibold leading-7 text-foreground"}>{value}</div>
          <div className="mt-0.5 text-[10px] leading-3 text-muted-foreground">{sub}</div>
        </div>
      </div>
    </Card>
  )
}

function AttentionRow({ icon: Icon, title, desc, count, tone }: { icon: typeof AlertTriangle; title: string; desc: string; count: string; tone: "warning" | "destructive" }) {
  return (
    <div className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-muted/40">
      <div className="flex items-center gap-3">
        <div className={"flex size-8 items-center justify-center rounded-full " + (tone === "warning" ? "bg-amber-500/10 text-amber-600" : "bg-destructive/10 text-destructive")}><Icon className="size-4" /></div>
        <div><div className="text-sm font-medium text-foreground">{title}</div><div className="text-xs text-muted-foreground">{desc}</div></div>
      </div>
      <div className={"text-sm font-semibold " + (tone === "warning" ? "text-amber-600" : "text-destructive")}>{count}</div>
    </div>
  )
}
