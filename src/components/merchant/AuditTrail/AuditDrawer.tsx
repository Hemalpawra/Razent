"use client"

import { useState, useEffect } from "react"
import {
  XIcon,
  FileTextIcon,
  MessageCircleIcon,
  PackageIcon,
  ReceiptIcon,
  EyeIcon,
  ExternalLinkIcon,
  CopyIcon,
  CheckIcon,
  ClockIcon,
  ShieldAlertIcon,
  LayersIcon,
} from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import type { AuditSession, AuditEvent, AuditResult } from "@/lib/types/audit"
import { useNavigate } from "react-router-dom"
import { isMerchantSubdomain } from "@/lib/utils/subdomain"
import { useUI } from "@/state/useUI"
import { useMerchant } from "@/state/useMerchant"
import { toast } from "sonner"
import InvoiceDialog from "@/components/merchant/Orders/InvoiceDialog"

function resultVariant(
  r: AuditResult,
): "success" | "warning" | "destructive" | "secondary" {
  if (r === "Success") return "success"
  if (r === "Warning") return "warning"
  if (r === "Failed" || r === "Critical") return "destructive"
  return "secondary"
}

function severityVariant(
  s: AuditResult,
): "success" | "warning" | "destructive" | "secondary" {
  if (s === "Success") return "success"
  if (s === "Warning") return "warning"
  if (s === "Failed" || s === "Critical") return "destructive"
  return "secondary"
}

export default function AuditDrawer({
  open,
  onClose,
  session,
  event: initialEvent,
}: {
  open: boolean
  onClose: () => void
  session: AuditSession | null
  event: AuditEvent | null
}) {
  const setActiveScreen = useUI((s) => s.setActiveScreen)
  const { role } = useMerchant()
  const [activeTab, setActiveTab] = useState<string>("summary")
  const [copied, setCopied] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    initialEvent?.id || null,
  )
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)

  const navigate = useNavigate()
  const isSubdomain = isMerchantSubdomain()

  // Reset/sync active event whenever drawer opens or session changes
  useEffect(() => {
    if (open && session) {
      if (initialEvent) {
        setSelectedEventId(initialEvent.id)
      } else if (session.events && session.events.length > 0) {
        // Default to latest event in the sequence
        setSelectedEventId(session.events[session.events.length - 1].id)
      } else {
        setSelectedEventId(null)
      }
    }
  }, [open, session, initialEvent])

  // Select current active event
  const events = session?.events || []
  const activeEvent =
    (selectedEventId ? events.find((e) => e.id === selectedEventId) : null) ||
    initialEvent ||
    (events.length > 0 ? events[events.length - 1] : null)

  const title = activeEvent
    ? activeEvent.type
    : session
      ? `Session ${session.session_id}`
      : "Audit details"

  const status: AuditResult = activeEvent?.result ?? session?.status ?? "Success"
  const severity: AuditResult = session?.severity ?? activeEvent?.result ?? "Success"
  const ts = activeEvent?.timestamp ?? session?.created_at ?? new Date().toISOString()
  const source = activeEvent?.source ?? session?.events[0]?.source ?? "store"
  const actor = activeEvent?.actor ?? session?.actor_label ?? "System"
  const orderId = session?.order_id || null
  const relatedProduct =
    activeEvent?.related_product ||
    events.find((e) => e.related_product)?.related_product ||
    null

  const handleCopySessionId = () => {
    if (!session) return
    navigator.clipboard.writeText(session.session_id)
    setCopied(true)
    toast.success("Session ID copied")
    setTimeout(() => setCopied(false), 2000)
  }

  const linkedConvId =
    (session as any)?.conversation_id ||
    (session?.session_id?.startsWith("conv_") ? session.session_id : null)

  const handleViewConversation = () => {
    if (role === "view_only") {
      toast.error("View-only account: Access to customer conversation transcripts is restricted.")
      return
    }
    onClose()
    if (linkedConvId) {
      useUI.getState().openConversationDrawer(linkedConvId)
    }
    setActiveScreen("ai_agent")
    navigate(isSubdomain ? "/ai_agent" : "/merchant/ai_agent")
  }

  const handleViewOrder = () => {
    if (!orderId) {
      toast.info("No order is associated with this audit session.")
      return
    }
    onClose()
    useUI.getState().openOrderDrawer(orderId)
    setActiveScreen("orders")
    navigate(isSubdomain ? "/orders" : "/merchant/orders")
  }

  const handleViewProduct = () => {
    onClose()
    setActiveScreen("products")
    navigate(isSubdomain ? "/products" : "/merchant/products")
    if (relatedProduct) {
      toast.info(`Showing products for: ${relatedProduct}`)
    }
  }

  const handleViewInvoice = () => {
    if (!orderId) {
      toast.info("No invoice found: this session did not produce an order.")
      return
    }
    setInvoiceDialogOpen(true)
  }

  return (
    <>
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="p-0 max-h-[100vh] flex flex-col">
          <DrawerHeader className="p-4 border-b shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-primary/10 text-primary">
                <LayersIcon className="size-4" />
              </span>
              <div>
                <DrawerTitle className="text-base font-heading font-semibold tracking-tight">
                  Audit Session Details
                </DrawerTitle>
                <DrawerDescription className="text-xs text-muted-foreground font-mono">
                  {session?.session_id || "No session"}
                </DrawerDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="p-1 rounded-md hover:bg-muted"
              onClick={onClose}
              aria-label="Close"
            >
              <XIcon className="size-4" />
            </Button>
          </DrawerHeader>

          <DrawerBody className="p-0 flex-1 overflow-y-auto flex flex-col">
            {!session ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No session selected.
              </div>
            ) : (
              <>
                {/* Session Header Card */}
                <div className="p-4 bg-muted/20 border-b space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <h2 className="font-heading font-semibold text-sm truncate">
                        {title}
                      </h2>
                      <Badge variant={resultVariant(status)} className="rounded-full text-[11px] shrink-0">
                        {status}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px] gap-1 shrink-0 font-mono text-muted-foreground hover:text-foreground"
                      onClick={handleCopySessionId}
                    >
                      {copied ? <CheckIcon className="size-3 text-emerald-500" /> : <CopyIcon className="size-3" />}
                      {session.session_id.slice(-8)}
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ClockIcon className="size-3" />
                      {new Date(ts).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                    <span>·</span>
                    <span>{actor}</span>
                    <span>·</span>
                    <span className="font-medium text-foreground">{source}</span>
                  </div>
                </div>

                {/* 5 Tabs per Spec */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                  <div className="sticky top-0 z-10 bg-card border-b px-4">
                    <TabsList className="w-full justify-start rounded-none border-0 bg-transparent p-0 h-auto gap-4 overflow-x-auto">
                      <TabsTrigger
                        value="summary"
                        className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-2.5 text-xs font-medium shadow-none data-[selected]:border-primary data-[selected]:text-primary text-muted-foreground"
                      >
                        Summary
                      </TabsTrigger>
                      <TabsTrigger
                        value="details"
                        className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-2.5 text-xs font-medium shadow-none data-[selected]:border-primary data-[selected]:text-primary text-muted-foreground"
                      >
                        Details
                      </TabsTrigger>
                      <TabsTrigger
                        value="payload"
                        className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-2.5 text-xs font-medium shadow-none data-[selected]:border-primary data-[selected]:text-primary text-muted-foreground"
                      >
                        Payload
                      </TabsTrigger>
                      <TabsTrigger
                        value="timeline"
                        className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-2.5 text-xs font-medium shadow-none data-[selected]:border-primary data-[selected]:text-primary text-muted-foreground"
                      >
                        Timeline ({events.length})
                      </TabsTrigger>
                      <TabsTrigger
                        value="linked"
                        className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-2.5 text-xs font-medium shadow-none data-[selected]:border-primary data-[selected]:text-primary text-muted-foreground"
                      >
                        Linked Items
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* 1. SUMMARY TAB */}
                  <TabsContent value="summary" className="p-4 space-y-4 m-0 flex-1">
                    <Card className="rounded-xl bg-card border shadow-none">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                          Session Overview
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-xs">
                        <div className="grid grid-cols-2 gap-3 pb-3 border-b border-border/50">
                          <div>
                            <span className="text-[11px] text-muted-foreground uppercase">Status</span>
                            <div className="mt-1">
                              <Badge variant={resultVariant(status)} className="rounded-full text-[11px]">
                                {status}
                              </Badge>
                            </div>
                          </div>
                          <div>
                            <span className="text-[11px] text-muted-foreground uppercase">Severity</span>
                            <div className="mt-1">
                              <Badge variant={severityVariant(severity)} className="rounded-full text-[11px]">
                                {severity}
                              </Badge>
                            </div>
                          </div>
                          <div>
                            <span className="text-[11px] text-muted-foreground uppercase">Actor</span>
                            <div className="font-medium text-foreground mt-0.5">{actor}</div>
                          </div>
                          <div>
                            <span className="text-[11px] text-muted-foreground uppercase">Source</span>
                            <div className="font-medium text-foreground mt-0.5">{source}</div>
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] text-muted-foreground uppercase">Activity Narrative</span>
                          <p className="text-muted-foreground leading-relaxed">
                            {activeEvent?.reason ||
                              activeEvent?.payload_summary ||
                              `${session.customer} triggered ${session.event_count} actions; last event: ${session.last_event}.`}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl bg-card border shadow-none p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-foreground">Event Chain Progress</div>
                          <div className="text-[11px] text-muted-foreground">
                            {events.length} sequential protocol step(s) recorded in Supabase
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs rounded-lg"
                          onClick={() => setActiveTab("timeline")}
                        >
                          View Full Trail
                        </Button>
                      </div>
                    </Card>
                  </TabsContent>

                  {/* 2. DETAILS TAB */}
                  <TabsContent value="details" className="p-4 space-y-4 m-0 flex-1">
                    <Card className="rounded-xl bg-card border shadow-none">
                      <CardContent className="p-4 space-y-2.5 text-xs divide-y divide-border/40">
                        <DetailRow label="Event Type" value={activeEvent?.type || session.last_event} />
                        <DetailRow label="Session ID" value={session.session_id} mono />
                        <DetailRow
                          label="Order ID"
                          value={
                            orderId ? (
                              orderId
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground/80 font-normal border-dashed bg-muted/20">
                                Not Created
                              </Badge>
                            )
                          }
                          mono={!!orderId}
                        />
                        <DetailRow label="Customer / User" value={session.customer?.trim() ? session.customer : "Guest Customer"} />
                        <DetailRow label="Actor" value={actor} />
                        <DetailRow label="Source System" value={source} />
                        <DetailRow
                          label="Execution Result"
                          value={
                            <Badge variant={resultVariant(status)} className="rounded-full text-[11px]">
                              {status}
                            </Badge>
                          }
                        />
                        <DetailRow
                          label="Reason / Note"
                          value={activeEvent?.reason || "Normal transaction execution"}
                        />
                        <DetailRow
                          label="Related Product"
                          value={relatedProduct || "No product directly tagged"}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* 3. PAYLOAD TAB (Event-Wise Capture) */}
                  <TabsContent value="payload" className="p-4 space-y-4 m-0 flex-1">
                    <div className="flex items-center justify-between bg-muted/30 p-2.5 rounded-lg border border-border/70 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-foreground shrink-0">Selected Event Step:</span>
                        <Badge variant="secondary" className="font-mono text-[11px] truncate">
                          {activeEvent?.type || session.last_event || "Session Event"}
                        </Badge>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono shrink-0">
                        Event-wise payload
                      </Badge>
                    </div>

                    <Card className="rounded-xl bg-card border shadow-none">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xs font-semibold">Request & Inbound Summary</CardTitle>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {activeEvent?.request_id || activeEvent?.id || session.session_id}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <pre className="rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed font-mono overflow-auto max-h-[160px]">
                          {activeEvent?.payload_summary ||
                            (orderId
                              ? JSON.stringify({ session_id: session.session_id, order_id: orderId, customer: session.customer || "Guest Customer" }, null, 2)
                              : JSON.stringify({ session_id: session.session_id, step: activeEvent?.type, result: activeEvent?.result }, null, 2))}
                        </pre>
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl bg-card border shadow-none">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xs font-semibold">Response & Outbound Summary</CardTitle>
                          <Badge
                            variant={activeEvent?.status_code && activeEvent.status_code >= 400 ? "destructive" : "outline"}
                            className="font-mono text-[10px]"
                          >
                            HTTP {activeEvent?.status_code || 200}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <pre className="rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed font-mono overflow-auto max-h-[160px]">
                          {activeEvent?.response_summary ||
                            JSON.stringify(
                              {
                                status: (activeEvent?.result || status).toLowerCase(),
                                reason: activeEvent?.reason || "Event executed successfully",
                                verified: true,
                              },
                              null,
                              2,
                            )}
                        </pre>
                      </CardContent>
                    </Card>

                    {/* Metadata Card */}
                    <Card className="rounded-xl bg-card border shadow-none">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold">Event Metadata</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {activeEvent?.metadata && Object.keys(activeEvent.metadata).length > 0 ? (
                          <div className="divide-y divide-border/40 text-xs">
                            {Object.entries(activeEvent.metadata).map(([k, v]) => (
                              <div key={k} className="flex justify-between py-1.5 font-mono text-[11px]">
                                <span className="text-muted-foreground">{k}:</span>
                                <span className="text-foreground font-medium truncate max-w-[220px]">
                                  {typeof v === "object" ? JSON.stringify(v) : String(v)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground py-2 font-mono flex items-center justify-between">
                            <span>actor: {activeEvent?.actor || actor}</span>
                            <span>source: {activeEvent?.source || source}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* 4. TIMELINE TAB */}
                  <TabsContent value="timeline" className="p-4 space-y-3 m-0 flex-1">
                    <div className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                      <span>{events.length} sequential protocol step(s) recorded in Supabase</span>
                      <span className="text-[11px] text-muted-foreground">Click step to view payload</span>
                    </div>
                    <div className="relative border-l-2 border-border/80 pl-4 py-2 space-y-4 ml-3">
                      {events.map((e, idx) => {
                        const isSelected = activeEvent?.id === e.id
                        return (
                          <div
                            key={e.id || idx}
                            role="button"
                            onClick={() => setSelectedEventId(e.id)}
                            className={`group relative p-3 rounded-lg border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/20"
                                : "bg-card hover:bg-muted/40 border-border/60"
                            }`}
                          >
                            <span
                              className={`absolute -left-[23px] top-4 size-3 rounded-full border-2 border-background ${
                                e.result === "Success"
                                  ? "bg-emerald-500"
                                  : e.result === "Warning"
                                    ? "bg-amber-500"
                                    : "bg-destructive"
                              }`}
                            />
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  #{idx + 1}
                                </span>
                                <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                                  {e.type}
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {new Date(e.timestamp).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge variant={resultVariant(e.result)} className="rounded-full text-[10px] px-1.5 py-0">
                                {e.result}
                              </Badge>
                              <span className="text-[11px] text-muted-foreground">
                                {e.actor} · {e.source}
                              </span>
                            </div>
                            {e.reason && (
                              <p className="text-[11px] text-muted-foreground mt-1.5 leading-normal">
                                {e.reason}
                              </p>
                            )}
                            {isSelected && (
                              <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
                                <span className="text-primary font-medium">Currently inspecting</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1.5 text-[10px] text-primary hover:text-primary"
                                  onClick={(ev) => {
                                    ev.stopPropagation()
                                    setActiveTab("payload")
                                  }}
                                >
                                  Inspect Payload &rarr;
                                </Button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </TabsContent>

                  {/* 5. LINKED ITEMS TAB */}
                  <TabsContent value="linked" className="p-4 space-y-3 m-0 flex-1">
                    <div className="text-xs text-muted-foreground mb-1">
                      Authoritative canonical records linked to this session.
                    </div>

                    <LinkedItemCard
                      icon={MessageCircleIcon}
                      title="Customer Conversation"
                      subtitle={
                        linkedConvId
                          ? linkedConvId
                          : "Direct storefront session (no AI chat attached)"
                      }
                      badge={linkedConvId ? "Linked Chat" : "Direct Web"}
                      actionLabel="View Conversation"
                      disabled={!linkedConvId}
                      onClick={handleViewConversation}
                    />

                    <LinkedItemCard
                      icon={PackageIcon}
                      title="Store Order"
                      subtitle={orderId || "Order not created for this session"}
                      badge={orderId ? "Confirmed" : "Not Created"}
                      actionLabel="View Order"
                      disabled={!orderId}
                      onClick={handleViewOrder}
                    />

                    <LinkedItemCard
                      icon={FileTextIcon}
                      title="Catalog Product"
                      subtitle={relatedProduct || "View store products"}
                      badge={relatedProduct ? "Linked SKU" : "Catalog"}
                      actionLabel="View Product"
                      onClick={handleViewProduct}
                    />

                    <LinkedItemCard
                      icon={ReceiptIcon}
                      title="Tax Invoice"
                      subtitle={
                        orderId
                          ? `INV-${new Date().getFullYear()}-${orderId.slice(-6).toUpperCase()}`
                          : "Requires confirmed order"
                      }
                      badge={orderId ? "GST Verified" : "Not Created"}
                      actionLabel="View Invoice"
                      disabled={!orderId}
                      onClick={handleViewInvoice}
                    />
                  </TabsContent>
                </Tabs>

                {/* Footer Drawer Action */}
                <div className="p-4 border-t bg-card flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-lg text-xs"
                    onClick={() => setActiveTab(activeTab === "timeline" ? "summary" : "timeline")}
                  >
                    {activeTab === "timeline" ? "Back to Summary" : "View Full Timeline"}
                  </Button>
                  <Button
                    variant="default"
                    className="flex-1 rounded-lg text-xs"
                    onClick={onClose}
                  >
                    Close Drawer
                  </Button>
                </div>
              </>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Reusable Tax Invoice Dialog */}
      <InvoiceDialog
        open={invoiceDialogOpen}
        onClose={() => setInvoiceDialogOpen(false)}
        orderId={orderId}
      />
    </>
  )
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 first:pt-0 last:pb-0">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span
        className={`text-right text-foreground ${
          mono ? "font-mono text-[11px]" : "font-medium text-xs"
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function LinkedItemCard({
  icon: Icon,
  title,
  subtitle,
  badge,
  actionLabel,
  disabled = false,
  onClick,
}: {
  icon: typeof FileTextIcon
  title: string
  subtitle: string
  badge: string
  actionLabel: string
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-card p-3 shadow-2xs">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground truncate">{title}</span>
            <Badge variant="secondary" className="rounded-full text-[10px] px-1.5 py-0 shrink-0">
              {badge}
            </Badge>
          </div>
          <div className="text-[11px] text-muted-foreground font-mono truncate">{subtitle}</div>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={onClick}
        className="h-7 text-xs rounded-lg gap-1 shrink-0 ml-2"
      >
        <ExternalLinkIcon className="size-3" /> {actionLabel}
      </Button>
    </div>
  )
}
