"use client" // Mobile handled in AuditTrailScreen

import {
  XIcon,
  FileTextIcon,
  MessageCircleIcon,
  PackageIcon,
  ReceiptIcon,
  EyeIcon,
} from "lucide-react"
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import type { AuditSession, AuditEvent, AuditResult } from "@/lib/types/audit"
import { useIsMobile } from "@/hooks/use-mobile"
import { useUI } from "@/state/useUI"

function resultVariant(
  r: AuditResult,
): "success" | "warning" | "destructive" | "secondary" | "default" {
  if (
    r ===
    "Success"
  )
    return "success"
  if (
    r ===
    "Warning"
  )
    return "warning"
  if (
    r ===
    "Failed"
  )
    return "destructive"
  if (
    r ===
    "Critical"
  )
    return "destructive"
  return "secondary"
}

export default function AuditDrawer({
  open,
  onClose,
  session,
  event,
}: {
  open: boolean
  onClose: () => void
  session: AuditSession | null
  event: AuditEvent | null
}) {
  const isMobile = useIsMobile()
  const setActiveScreen = useUI((s) => s.setActiveScreen)

  if (isMobile) {
    return null
  }

  const title = event
    ? event.type
    : session
      ? `Session ${session.session_id}`
      : "Audit details"
  const severity: AuditResult = event
    ? event.result
    : session
      ? session.severity
      : "Success"
  const ts = event?.timestamp ?? session?.created_at ?? new Date().toISOString()
  const source = event?.source ?? session?.events[0]?.source ?? "system"
  const actor = event?.actor ?? session?.customer ?? "system"
  const result = event?.result ?? session?.status ?? "Success"

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="p-6">
        <DrawerHeader>
          <DrawerTitle className="text-lg font-heading font-medium tracking-tight">
            Audit Details
          </DrawerTitle>
          <DrawerDescription>{title}</DrawerDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted/30"
            onClick={onClose}
            aria-label="Close"
          >
            <XIcon className="size-4" />
          </Button>
        </DrawerHeader>

        <div className="mt-6">
          <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <DrawerTitle className="text-base leading-tight">
                  {title}
                </DrawerTitle>
                <Badge
                  variant={resultVariant(severity)}
                  className="rounded-full text-[11px]"
                >
                  {severity}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {new Date(ts).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0 p-1 rounded-md hover:bg-muted/30"
            >
              <XIcon className="size-4" />
            </Button>
          </div>

          {!session ? (
            <div className="p-6 text-sm text-muted-foreground">
              No session selected.
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto">
                <Tabs defaultValue="summary" className="w-full">
                  <div className="sticky top-0 z-10 bg-popover border-b px-4">
                    <TabsList className="w-full justify-start rounded-none border-0 bg-transparent p-0 h-auto gap-4 overflow-x-auto">
                      <TabsTrigger
                        value="summary"
                        className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-2 text-xs font-medium shadow-none data-[selected]:border-primary data-[selected]:text-foreground text-muted-foreground"
                      >
                        Summary
                      </TabsTrigger>
                      <TabsTrigger
                        value="details"
                        className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-2 text-xs font-medium shadow-none data-[selected]:border-primary data-[selected]:text-foreground text-muted-foreground"
                      >
                        Details
                      </TabsTrigger>
                      <TabsTrigger
                        value="payload"
                        className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-2 text-xs font-medium shadow-none data-[selected]:border-primary data-[selected]:text-foreground text-muted-foreground"
                      >
                        Payload
                      </TabsTrigger>
                      <TabsTrigger
                        value="timeline"
                        className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-2 text-xs font-medium shadow-none data-[selected]:border-primary data-[selected]:text-foreground text-muted-foreground"
                      >
                        Timeline
                      </TabsTrigger>
                      <TabsTrigger
                        value="linked"
                        className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-2 text-xs font-medium shadow-none data-[selected]:border-primary data-[selected]:text-foreground text-muted-foreground"
                      >
                        Linked Items
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="summary" className="mt-4 p-4 space-y-4">
                    <Card className="rounded-xl bg-card shadow-none">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">
                          {event ? event.type : `Session ${session.session_id}`}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-xs">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={resultVariant(result)}
                            className="rounded-full text-[11px]"
                          >
                            {result}
                          </Badge>
                          <span className="text-muted-foreground">
                            {source} · {actor}
                          </span>
                        </div>
                        <p className="text-muted-foreground leading-5">
                          {event
                            ? (event.reason ??
                              `${event.type} completed with ${event.result.toLowerCase()} result.`)
                            : `${session.customer} · ${session.event_count} events · last: ${session.last_event}`}
                        </p>
                        <Separator />
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Session
                            </div>
                            <div className="font-mono text-xs">
                              {session.session_id}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Order
                            </div>
                            <div className="font-mono text-xs">
                              {session.order_id ?? "—"}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Timestamp
                            </div>
                            <div className="text-xs">
                              {new Date(ts).toLocaleString("en-IN", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Result
                            </div>
                            <div className="text-xs font-medium">{result}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="details" className="mt-4 p-4">
                    <Card className="rounded-xl bg-card shadow-none">
                      <CardContent className="p-4 space-y-3 text-xs">
                        <Row
                          label="Event type"
                          value={event?.type ?? session.last_event}
                        />
                        <Row
                          label="Session ID"
                          value={session.session_id}
                          mono
                        />
                        <Row
                          label="Order ID"
                          value={session.order_id ?? "—"}
                          mono
                        />
                        <Row label="Actor" value={String(actor)} />
                        <Row label="Source" value={String(source)} />
                        <Row
                          label="Result"
                          value={
                            <Badge
                              variant={resultVariant(result)}
                              className="rounded-full text-[11px]"
                            >
                              {result}
                            </Badge>
                          }
                        />
                        <Row label="Reason" value={event?.reason ?? "—"} />
                        <Row
                          label="Related product"
                          value={event?.related_product ?? "Air Purifier Pro"}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="payload" className="mt-4 p-4 space-y-4">
                    <Card className="rounded-xl bg-card shadow-none">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-mono">
                          Request · {event?.request_id ?? session.session_id}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="rounded-lg bg-muted p-3 text-[11px] leading-4 overflow-auto max-h-[180px]">
                          {event?.payload_summary ??
                            JSON.stringify(
                              {
                                session_id: session.session_id,
                                order_id: session.order_id,
                              },
                              null,
                              2,
                            )}
                        </pre>
                      </CardContent>
                    </Card>
                    <Card className="rounded-xl bg-card shadow-none">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-mono">
                          Response · {event?.status_code ?? 200}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="rounded-lg bg-muted p-3 text-[11px] leading-4 overflow-auto max-h-[180px]">
                          {event?.response_summary ??
                            JSON.stringify(
                              { status: String(result).toLowerCase() },
                              null,
                              2,
                            )}
                        </pre>
                      </CardContent>
                    </Card>
                    <div className="flex gap-2 text-[11px] text-muted-foreground">
                      <Badge variant="outline" className="rounded-full">
                        status {event?.status_code ?? 200}
                      </Badge>
                      <span>ip {event?.metadata?.ip ?? "203.0.113.42"}</span>
                      <span>region {event?.metadata?.region ?? "IN-KA"}</span>
                    </div>
                  </TabsContent>

                  <TabsContent value="timeline" className="mt-4 p-4">
                    <Card className="rounded-xl bg-card shadow-none">
                      <CardContent className="p-0">
                        <div className="relative ml-4 border-l-2 border-border/60 pl-4 py-2 space-y-4">
                          {session.events.map((e) => (
                            <div key={e.id} className="relative">
                              <span
                                className={`absolute -left-[29px] top-0.5 flex size-4 items-center justify-center rounded-full border text-[10px] ${
                                  e.result === "Success"
                                    ? "bg-emerald-500 border-emerald-500 text-white"
                                    : e.result === "Warning"
                                      ? "bg-amber-500 border-amber-500 text-white"
                                      : "bg-destructive border-destructive text-white"
                                }`}
                              >
                                •
                              </span>
                              <div className="flex justify-between gap-2">
                                <span className="text-sm font-medium">
                                  {e.type}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {new Date(e.timestamp).toLocaleTimeString(
                                    "en-IN",
                                    { hour: "2-digit", minute: "2-digit" },
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge
                                  variant={resultVariant(e.result)}
                                  className="rounded-full text-[11px]"
                                >
                                  {e.result}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {e.actor} · {e.source}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="linked" className="mt-4 p-4 space-y-3">
                    <LinkedRow
                      icon={MessageCircleIcon}
                      label="Related conversation"
                      sub={session.session_id}
                      btn="View Conversation"
                    />
                    <LinkedRow
                      icon={PackageIcon}
                      label="Related order"
                      sub={session.order_id ?? "No order yet"}
                      btn="View Order"
                    />
                    <LinkedRow
                      icon={FileTextIcon}
                      label="Related product"
                      sub="Air Purifier Pro"
                      btn="View Product"
                    />
                    <LinkedRow
                      icon={ReceiptIcon}
                      label="Related invoice"
                      sub={
                        session.order_id
                          ? `INV-${session.order_id.slice(-6).toUpperCase()}`
                          : "—"
                      }
                      btn="View Invoice"
                    />
                  </TabsContent>
                </Tabs>
              </div>

              <div className="mt-4 flex gap-2 border-t border-border/60 pt-4">
                <Button className="flex-1 rounded-lg">View Full Trail</Button>
                <Button variant="outline" className="rounded-lg bg-card">
                  Export Event
                </Button>
                <Button
                  variant="outline"
                  className="rounded-lg bg-card"
                  onClick={onClose}
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function Row({
  label,
  value,
  mono,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`${
          mono ? "font-mono text-[11px]" : "font-medium text-xs"
        } text-right`}
      >
        {value}
      </span>
    </div>
  )
}

function LinkedRow({
  icon: Icon,
  label,
  sub,
  btn,
}: {
  icon: typeof FileTextIcon
  label: string
  sub: string
  btn: string
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{label}</div>
          <div className="text-xs text-muted-foreground font-mono truncate">
            {sub}
          </div>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-6 rounded-lg bg-card shrink-0 text-xs"
      >
        <EyeIcon className="size-3.5" /> {btn}
      </Button>
    </div>
  )
}
