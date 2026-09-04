import {
  Users,
  ShoppingCart,
  IndianRupee,
  MessageCircle,
  TrendingUp,
  Package,
  Lightbulb,
  AlertTriangle,
  Eye,
  ChevronDown,
  Download,
  Bot,
  User,
  Star,
  Send,
  XIcon,
  Sparkles,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageGroup,
} from "@/components/ui/message"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { formatPrice } from "@/lib/types/product"
import {
  listConversations,
  listOrders,
  updateConversationStatus,
  upsertConversation,
  subscribeToConversations,
} from "@/lib/api/client"
import type { Conversation, ConversationStatus, ChatMessage } from "@/lib/types/conversation"
import type { Order } from "@/lib/types/order"
import { useState, useEffect } from "react"
import ConversationDrawer from "@/components/merchant/AIAgent/ConversationDrawer"

const statusVariant: Record<ConversationStatus, "success" | "secondary" | "warning" | "destructive" | "default"> =
  {
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

const PRODUCTS = [
  {
    id: "p1",
    name: "Fresh Robusta Bananas (1 kg)",
    subtitle: "Farm fresh · 1 kg bunch · Grade A",
    price: 4800,
    rating: 4.9,
    img: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=240&q=70&auto=format&fit=crop",
    added: true,
  },
  {
    id: "p2",
    name: "Amul Taaza Toned Milk (1L)",
    subtitle: "Pasteurised toned milk · 1 Litre pouch",
    price: 5600,
    rating: 4.8,
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=240&q=70&auto=format&fit=crop",
    added: true,
  },
  {
    id: "p3",
    name: "Farm Fresh Brown Eggs (6 pcs)",
    subtitle: "High protein · Farm fresh brown eggs",
    price: 5200,
    rating: 4.7,
    img: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=240&q=70&auto=format&fit=crop",
    added: false,
  },
]

const QUICK_CHIPS = [
  "Yes, proceed",
  "Show cheaper options",
  "Compare all 3",
  "Add to cart",
]

export default function AIAgentScreen({
  loading,
  error,
}: {
  loading?: boolean
  error?: string | null
}) {
  const [splitOpen, setSplitOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")

  const [convData, setConvData] = useState<Conversation[]>([])
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    listConversations().then(setConvData).catch(() => setConvData([]))
    listOrders().then(setOrders).catch(() => setOrders([]))

    // Realtime live subscription to conversations
    const unsubscribe = subscribeToConversations(() => {
      listConversations().then(setConvData).catch(() => {})
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const selected = selectedId
    ? (convData.find((c) => c.id === selectedId) ?? null)
    : null
  const activeCount = convData.filter(
    (c) =>
      c.status === "active" ||
      c.status === "waiting_for_customer" ||
      c.status === "waiting_for_payment",
  ).length

  const todayStr = new Date().toISOString().slice(0, 10)
  const ordersToday = orders.filter((o) => o.created_at.startsWith(todayStr)).length
  const revenueToday = orders
    .filter((o) => o.status === "paid" && o.created_at.startsWith(todayStr))
    .reduce((s, o) => s + o.total_paise, 0)
  const customersHelped = convData.length
  const conversionRate = convData.length > 0
    ? `${((orders.filter((o) => o.via_ai).length / convData.length) * 100).toFixed(1)}%`
    : "0%"

  const [dateRange, setDateRange] = useState("Last 7 Days")
  const cycleDateRange = () => {
    const list = ["Today", "Last 7 Days", "Last 30 Days", "All Time"]
    const next = list[(list.indexOf(dateRange) + 1) % list.length]
    setDateRange(next)
  }

  const handleOpen = (id: string) => {
    setSelectedId(id)
    // desktop -> split, mobile -> drawer fallback
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setDrawerOpen(true)
    } else {
      setSplitOpen(true)
    }
  }

  const handleCloseSplit = () => setSplitOpen(false)

  const handleStatusChange = async (newStatus: ConversationStatus) => {
    if (!selected) return
    await updateConversationStatus(selected.id, newStatus as any)
    setConvData((prev) =>
      prev.map((c) => (c.id === selected.id ? { ...c, status: newStatus } : c)),
    )
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selected) return
    const msgText = inputValue.trim()
    setInputValue("")
    const newMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      role: "ai",
      text: msgText,
      at: new Date().toISOString(),
    }
    const updatedMsgs = [...(selected.messages || []), newMsg]
    const updated: Conversation = {
      ...selected,
      last_message: msgText,
      messages: updatedMsgs,
    }
    setConvData((prev) =>
      prev.map((c) => (c.id === selected.id ? updated : c)),
    )
    await upsertConversation({
      external_id: selected.id,
      merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
      customer_name: selected.customer_name,
      last_message: msgText,
      status: selected.status,
      messages: updatedMsgs,
    })
  }

  if (loading) {
    return (
      <div className="space-y-3 bg-muted/30 -m-6 p-6">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-muted/30 -m-6 p-6">
        <Card className="rounded-xl bg-card p-10 text-center">
          <p className="text-sm font-medium text-destructive">
            Failed to load AI Agent
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          <Button className="mt-4" onClick={() => location.reload()}>
            Retry
          </Button>
        </Card>
      </div>
    )
  }

  const empty = convData.length === 0

  if (empty) {
    return (
      <div className="bg-muted/30 -m-6 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-heading text-[32px] font-semibold leading-[38px] tracking-tight text-foreground">
              AI Agent
            </h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Monitor how your AI helps customers and drives more sales.
            </p>
          </div>
        </div>
        <Card className="mt-6 rounded-xl bg-card p-10 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessageCircle className="size-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">
            No conversations yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Your AI will appear here once products are imported and customers
            start chatting.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-3 bg-muted/30 -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-heading text-[32px] font-semibold leading-[38px] tracking-tight text-foreground">
            AI Agent
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Monitor how your AI helps customers and drives more sales.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="h-9 rounded-lg bg-card" onClick={cycleDateRange}>
            {dateRange}
            <ChevronDown className="size-4 opacity-60" />
          </Button>
          <Button variant="outline" className="h-9 rounded-lg bg-card">
            <Download className="size-4" />
            Export
          </Button>
          <Button
            className="h-9 rounded-lg"
            onClick={() => handleOpen((convData[0]?.id ?? "demo"))}
          >
            Test AI
          </Button>
          <div className="hidden items-center gap-3 pl-2 lg:flex">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              MS
            </div>
            <div className="leading-none">
              <div className="text-xs font-bold text-foreground">
                Merchant Store
              </div>
              <div className="text-[11px] text-muted-foreground">
                Super Admin
              </div>
            </div>
            <span className="text-xs text-muted-foreground">⌄</span>
          </div>
        </div>
      </div>

      {/* KPI — tighter gap-3 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={<Users className="size-4" />}
          label="Customers Helped"
          value={String(customersHelped)}
          sub="Active conversation sessions"
        />
        <KpiCard
          icon={<TrendingUp className="size-4" />}
          label="Conversion Rate"
          value={conversionRate}
          sub="AI assisted orders"
        />
        <KpiCard
          icon={<MessageCircle className="size-4" />}
          label="Active Conversations"
          value={String(activeCount)}
          sub="Waiting or active now"
        />
        <KpiCard
          icon={<ShoppingCart className="size-4" />}
          label="Orders Created Today"
          value={String(ordersToday)}
          sub="Via AI conversations"
        />
        <KpiCard
          icon={<IndianRupee className="size-4" />}
          label="Revenue Generated Today"
          value={formatPrice(revenueToday)}
          sub="From AI-assisted orders"
          valueIsAmount
        />
      </div>

      {/* Conditional layout: normal 70/30 when closed, split [1fr_380px] full-height when open */}
      {!splitOpen ? (
        <div className="grid gap-3 lg:grid-cols-[70%_30%]">
          {/* Left — Live Conversations */}
          <LiveConversationsCard onOpen={handleOpen} convData={convData} />
          {/* Right — needs attention */}
          <div className="space-y-3">
            <Card className="rounded-xl bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base">Needs Attention</CardTitle>
                <Badge variant="secondary" className="rounded-full text-[11px]">
                  {activeCount} open
                </Badge>
              </CardHeader>
              <CardContent className="space-y-1">
                {convData.filter((c) => c.status === "waiting_for_payment").length > 0 && (
                  <AttentionRow
                    icon={AlertTriangle}
                    title="Waiting for payment"
                    desc={`${convData.filter((c) => c.status === "waiting_for_payment").length} conversation awaiting checkout`}
                    count={String(convData.filter((c) => c.status === "waiting_for_payment").length)}
                    tone="warning"
                  />
                )}
                {convData.filter((c) => c.status === "waiting_for_customer").length > 0 && (
                  <AttentionRow
                    icon={Users}
                    title="Waiting for customer response"
                    desc={`${convData.filter((c) => c.status === "waiting_for_customer").length} active customer threads`}
                    count={String(convData.filter((c) => c.status === "waiting_for_customer").length)}
                    tone="warning"
                  />
                )}
                {activeCount === 0 && (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    All AI interactions normal. No customer escalations pending.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[1fr_380px]">
          {/* Left — store visible, scrollable full-height */}
          <div className="min-w-0 xl:h-[calc(100vh-140px)] xl:overflow-auto xl:pr-1">
            <LiveConversationsCard
              onOpen={handleOpen}
              selectedId={selectedId}
              splitMode
              convData={convData}
            />
          </div>

          {/* Right — full-height AI workspace panel */}
          <Card className="flex flex-col overflow-hidden rounded-xl bg-card border shadow-sm xl:h-[calc(100vh-140px)] xl:sticky xl:top-3">
            {/* Header — Real Customer Info & Live Status */}
            <div className="shrink-0 border-b bg-card px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="size-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {selected?.customer_name || "Customer Conversation"}
                      </span>
                      <Badge
                        variant={statusVariant[selected?.status ?? "active"]}
                        className="rounded-full px-2 py-0 text-[11px] shrink-0"
                      >
                        {statusLabel[selected?.status ?? "active"]}
                      </Badge>
                    </div>
                    <div className="text-[11px] leading-4 text-muted-foreground truncate">
                      {selected ? sourceLabel(selected.type) : "AI Assistant"} ·{" "}
                      Protocol: {selected?.protocol || "direct_web"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {selected?.status === "active" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs rounded-full"
                      onClick={() => handleStatusChange("completed")}
                    >
                      Mark Resolved
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs rounded-full"
                      onClick={() => handleStatusChange("active")}
                    >
                      Reopen
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleCloseSplit}
                    aria-label="Close workspace"
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="size-3" /> Live assistant workspace
                </span>
                <span className="opacity-40">·</span>
                <span>
                  Started{" "}
                  {selected?.created_at
                    ? new Date(selected.created_at).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "Recently"}
                </span>
              </div>
            </div>

            {/* Message thread — Live dynamic conversation */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-muted/20">
              <MessageGroup>
                {selected?.messages && selected.messages.length > 0 ? (
                  selected.messages.map((m: any, idx: number) => {
                    const isCustomer = m.role === "customer" || m.role === "user"
                    return (
                      <Message
                        key={m.id || idx}
                        align={isCustomer ? "end" : "start"}
                      >
                        <MessageAvatar>
                          <Avatar className="size-7">
                            <AvatarFallback
                              className={
                                isCustomer
                                  ? "bg-muted text-foreground"
                                  : "bg-primary text-primary-foreground"
                              }
                            >
                              {isCustomer ? (
                                <User className="size-3.5" />
                              ) : (
                                <Bot className="size-3.5" />
                              )}
                            </AvatarFallback>
                          </Avatar>
                        </MessageAvatar>
                        <MessageContent
                          className={isCustomer ? "items-end" : "items-start"}
                        >
                          <Bubble
                            variant={isCustomer ? "muted" : "default"}
                            align={isCustomer ? "end" : "start"}
                          >
                            <BubbleContent className="text-sm whitespace-pre-wrap">
                              {m.text}
                            </BubbleContent>
                          </Bubble>
                          <span className="text-[10px] text-muted-foreground">
                            {m.at
                              ? new Date(m.at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Just now"}
                          </span>
                        </MessageContent>
                      </Message>
                    )
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                    <Bot className="size-10 mb-2 opacity-40" />
                    <p className="text-sm font-medium">No messages recorded</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Customer has connected to this session.
                    </p>
                  </div>
                )}
              </MessageGroup>
            </div>

            {/* Input at bottom */}
            <div className="shrink-0 border-t bg-card px-3 py-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Reply as Merchant Agent…"
                  className="h-9 flex-1 rounded-full bg-muted/40"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendMessage()
                  }}
                />
                <Button
                  size="icon"
                  className="size-9 shrink-0 rounded-full"
                  onClick={handleSendMessage}
                  aria-label="Send"
                >
                  <Send className="size-4" />
                </Button>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Bot className="size-3" /> Press Enter to send live reply to customer
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 rounded-full text-[11px]"
                  onClick={handleCloseSplit}
                >
                  Close workspace
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Mobile fallback drawer — hidden on md via SheetContent md:hidden, keep for small screens */}
      <ConversationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        conversation={selected}
      />
    </div>
  )
}

function LiveConversationsCard({
  onOpen,
  selectedId,
  splitMode,
  convData = [],
}: {
  onOpen: (id: string) => void
  selectedId?: string | null
  splitMode?: boolean
  convData?: Conversation[]
}) {
  return (
    <Card className="overflow-hidden rounded-xl bg-card py-0 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3 shrink-0">
        <div>
          <CardTitle className="text-base">Live Conversations</CardTitle>
          <CardDescription className="text-xs">
            Latest 5 · AI Assistant + AI Agent
          </CardDescription>
        </div>
        <Badge variant="secondary" className="rounded-full text-[11px]">
          {Math.min(5, convData.length)} of {convData.length}
        </Badge>
      </CardHeader>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-10 px-4 text-xs font-semibold text-foreground">
                Customer / Agent
              </TableHead>
              <TableHead className="h-10 px-3 text-xs font-semibold text-foreground">
                Source
              </TableHead>
              <TableHead className="h-10 px-3 text-xs font-semibold text-foreground">
                Status
              </TableHead>
              <TableHead className="h-10 px-3 text-right text-xs font-semibold text-foreground">
                Amount
              </TableHead>
              <TableHead className="h-10 px-3 text-xs font-semibold text-foreground hidden lg:table-cell">
                Last updated
              </TableHead>
              <TableHead className="h-10 px-4 text-right text-xs font-semibold text-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {convData.slice(0, 5).map((c) => (
              <TableRow
                key={c.id}
                className={
                  "hover:bg-muted/20 " +
                  (selectedId === c.id && splitMode ? "bg-primary/[0.04]" : "")
                }
              >
                <TableCell className="px-4 py-3">
                  <div className="text-sm font-medium text-foreground">
                    {c.customer_name}
                  </div>
                  <div className="max-w-[18rem] truncate text-xs text-muted-foreground">
                    {c.last_message}
                  </div>
                </TableCell>
                <TableCell className="px-3 py-3">
                  <Badge
                    variant={
                      c.type === "agent_to_agent" ? "default" : "secondary"
                    }
                    className="rounded-full text-[11px]"
                  >
                    {sourceLabel(c.type)}
                  </Badge>
                </TableCell>
                <TableCell className="px-3 py-3">
                  <Badge
                    variant={statusVariant[c.status]}
                    className="rounded-full px-2.5 py-0 text-[11px]"
                  >
                    {statusLabel[c.status]}
                  </Badge>
                </TableCell>
                <TableCell className="px-3 py-3 text-right text-sm font-medium tabular-nums text-foreground">
                  {c.amount_paise ? formatPrice(c.amount_paise) : "—"}
                </TableCell>
                <TableCell className="hidden lg:table-cell px-3 py-3 text-xs text-muted-foreground">
                  {new Date(c.updated_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  ·{" "}
                  {new Date(c.updated_at).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                  })}
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  <Button
                    variant={
                      selectedId === c.id && splitMode ? "default" : "outline"
                    }
                    size="sm"
                    className="h-7 rounded-md"
                    onClick={() => onOpen(c.id)}
                  >
                    <Eye className="size-3.5" /> Open
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between border-t bg-card px-4 py-3 text-xs text-muted-foreground">
        <span>Showing {Math.min(5, convData.length)} of {convData.length} conversations</span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 rounded-full bg-card"
          onClick={() => onOpen((convData[0]?.id ?? "demo"))}
        >
          Open latest
        </Button>
      </div>
    </Card>
  )
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  valueIsAmount,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  valueIsAmount?: boolean
}) {
  return (
    <Card className="rounded-xl bg-card p-5 shadow-sm py-5">
      <div className="flex gap-3">
        <div className="hidden size-11 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary sm:flex">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium leading-5 text-muted-foreground">
            {label}
          </div>
          <div
            className={
              valueIsAmount
                ? "mt-0.5 text-lg font-semibold leading-6 text-foreground"
                : "mt-0.5 font-heading text-[22px] font-semibold leading-7 text-foreground"
            }
          >
            {value}
          </div>
          <div className="mt-0.5 text-[10px] leading-3 text-muted-foreground">
            {sub}
          </div>
        </div>
      </div>
    </Card>
  )
}

function AttentionRow({
  icon: Icon,
  title,
  desc,
  count,
  tone,
}: {
  icon: typeof AlertTriangle
  title: string
  desc: string
  count: string
  tone: "warning" | "destructive"
}) {
  return (
    <div className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-muted/40">
      <div className="flex items-center gap-3">
        <div
          className={
            "flex size-8 items-center justify-center rounded-full " +
            (tone === "warning"
              ? "bg-amber-500/10 text-amber-600"
              : "bg-destructive/10 text-destructive")
          }
        >
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-sm font-medium text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      <div
        className={
          "text-sm font-semibold " +
          (tone === "warning" ? "text-amber-600" : "text-destructive")
        }
      >
        {count}
      </div>
    </div>
  )
}
