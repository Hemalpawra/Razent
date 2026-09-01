import { XIcon, Bot, User, Package, CreditCard, Truck, FileText, Eye } from "lucide-react"
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { formatPrice } from "@/lib/types/product"
import type { Conversation } from "@/lib/types/conversation"
import { mockOrders } from "@/lib/mock/orders"
import { useUI } from "@/state/useUI"

function sourceLabel(type: string) {
  return type === "agent_to_agent" ? "AI Agent" : "AI Assistant"
}

export default function ConversationDrawer({ open, onClose, conversation }: { open: boolean; onClose: () => void; conversation: Conversation | null }) {
  const setScreen = useUI((s) => s.setActiveScreen)
  const openOrderDrawer = useUI((s) => s.openOrderDrawer)
  const order = conversation?.order_id ? mockOrders.find((o) => o.id === conversation.order_id) ?? null : null

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[480px] max-w-[92vw] overflow-y-auto p-0">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-card px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Conversation Details</h2>
            <SheetTitle className="sr-only">Conversation</SheetTitle>
            <SheetDescription className="sr-only">Detail drawer</SheetDescription>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} aria-label="Close"><XIcon className="size-4" /></Button>
        </div>

        {!conversation ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">No conversation selected.</div>
        ) : (
          <div className="space-y-0">
            {/* Header with source + status */}
            <div className="px-6 pt-4 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">{conversation.type === "agent_to_agent" ? <Bot className="size-4" /> : <User className="size-4" />}</div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{conversation.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{conversation.id} · {new Date(conversation.updated_at).toLocaleString()}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant={conversation.type === "agent_to_agent" ? "default" : "secondary"} className="rounded-full text-[11px]">{sourceLabel(conversation.type)}</Badge>
                <Badge variant={conversation.status === "paid" || conversation.status === "completed" ? "success" : conversation.status === "failed" ? "destructive" : conversation.status === "active" ? "default" : "warning"} className="rounded-full text-[11px] capitalize">{conversation.status.replace(/_/g, " ")}</Badge>
                {conversation.amount_paise ? <Badge variant="secondary" className="rounded-full text-[11px]">{formatPrice(conversation.amount_paise)}</Badge> : null}
              </div>
            </div>

            {/* Top CTAs — Order / Tracking / Audit */}
            <div className="px-6 pb-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="h-8 rounded-full bg-card flex-1" onClick={() => { if (order) { onClose(); openOrderDrawer(order.id); setScreen("orders") } else { onClose(); setScreen("orders") } }}><Eye className="size-3.5" />View Order</Button>
              <Button size="sm" variant="outline" className="h-8 rounded-full bg-card flex-1"><Truck className="size-3.5" />Tracking</Button>
              <Button size="sm" variant="outline" className="h-8 rounded-full bg-card flex-1" onClick={() => { onClose(); setScreen("audit_placeholder") }}><FileText className="size-3.5" />Audit Trail</Button>
            </div>

            <Separator />

            {/* Tabs — variant line */}
            <Tabs defaultValue="conversation" className="px-6 pt-3">
              <TabsList className="w-full justify-start gap-6 bg-transparent p-0 h-auto rounded-none border-b">
                <TabsTrigger value="conversation" className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-1 -mb-px bg-transparent shadow-none data-[selected]:border-primary data-[selected]:text-foreground data-[selected]:shadow-none data-[selected]:bg-transparent text-muted-foreground">Conversation</TabsTrigger>
                <TabsTrigger value="products" className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-1 -mb-px bg-transparent shadow-none data-[selected]:border-primary data-[selected]:text-foreground data-[selected]:shadow-none data-[selected]:bg-transparent text-muted-foreground">Products & Timeline</TabsTrigger>
              </TabsList>

              <TabsContent value="conversation" className="mt-4 space-y-4 pb-6">
                {/* Chat — Message like shadcn: left AI avatar, right user avatar */}
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Chat — {sourceLabel(conversation.type)}</h3>
                  <div className="mt-3 flex flex-col gap-4">
                    {conversation.messages.map((m) => {
                      const isAI = m.role === "ai"
                      return (
                        <Message key={m.id} align={isAI ? "start" : "end"}>
                          <MessageAvatar>
                            <Avatar className="size-8">
                              <AvatarFallback className={isAI ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}>
                                {isAI ? <Bot className="size-4" /> : <User className="size-4" />}
                              </AvatarFallback>
                            </Avatar>
                          </MessageAvatar>
                          <MessageContent className={isAI ? "items-start" : "items-end"}>
                            <div className="text-[11px] text-muted-foreground">{isAI ? "AI Assistant" : conversation.type === "agent_to_agent" ? "Agent" : "Customer"} · {new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                            <Bubble variant={isAI ? "default" : "muted"} align={isAI ? "start" : "end"}>
                              <BubbleContent>{m.text}</BubbleContent>
                            </Bubble>
                          </MessageContent>
                        </Message>
                      )
                    })}
                  </div>
                </section>

                {order && (
                  <>
                    <Separator />
                    <section className="rounded-xl border bg-card p-3">
                      <div className="flex items-center gap-2 text-sm"><Package className="size-4 text-muted-foreground" /><span className="font-medium text-foreground">{order.id}</span><Badge variant={order.status === "paid" ? "success" : "secondary"} className="ml-auto rounded-full text-[11px] capitalize">{order.status}</Badge></div>
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="outline" className="h-7 rounded-full bg-card" onClick={() => { onClose(); openOrderDrawer(order.id); setScreen("orders") }}><Eye className="size-3.5" /> View Order</Button>
                        <Button size="sm" variant="outline" className="h-7 rounded-full bg-card"><FileText className="size-3.5" /> Invoice</Button>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Truck className="size-3.5" />{conversation.tracking_status ?? order.tracking?.carrier ?? "No tracking yet"}</div>
                    </section>
                  </>
                )}
              </TabsContent>

              <TabsContent value="products" className="mt-4 space-y-4 pb-6">
                {conversation.products_recommended.length > 0 && (
                  <section>
                    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Products Recommended</h3>
                    <div className="mt-3 grid gap-2">
                      {conversation.products_recommended.map((p) => (
                        <div key={p.product_id} className="flex items-center gap-3 rounded-lg border bg-card p-2">
                          <img src={p.image_url} alt={p.title} className="size-10 rounded-md object-cover ring-1 ring-border/50" loading="lazy" />
                          <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-foreground">{p.title}</div><div className="text-xs text-muted-foreground">{formatPrice(p.price_paise)}</div></div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {conversation.products_compared.length > 0 && (
                  <section>
                    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Products Compared</h3>
                    <div className="mt-3 flex gap-2 overflow-x-auto">
                      {conversation.products_compared.map((p) => (
                        <div key={p.product_id} className="shrink-0 rounded-lg border bg-card p-2 text-center">
                          <img src={p.image_url} alt={p.title} className="size-16 rounded-md object-cover mx-auto" loading="lazy" />
                          <div className="mt-2 text-xs font-medium text-foreground">{p.title}</div>
                          <div className="text-[11px] text-muted-foreground">{formatPrice(p.price_paise)}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {conversation.selected_product && (
                  <section>
                    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Selected Product</h3>
                    <div className="mt-3 flex items-center gap-3 rounded-xl border bg-primary/5 p-3">
                      <img src={conversation.selected_product.image_url} alt={conversation.selected_product.title} className="size-12 rounded-lg object-cover" loading="lazy" />
                      <div><div className="text-sm font-semibold text-foreground">{conversation.selected_product.title}</div><div className="text-xs text-muted-foreground">{formatPrice(conversation.selected_product.price_paise)}</div></div>
                      <Badge variant="success" className="ml-auto rounded-full">Selected</Badge>
                    </div>
                  </section>
                )}

                {conversation.upsell && (
                  <section>
                    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Upsell / Cross-sell</h3>
                    <div className="mt-3 flex items-center gap-3 rounded-lg border bg-amber-500/5 p-3">
                      <img src={conversation.upsell.image_url} alt={conversation.upsell.title} className="size-10 rounded-md object-cover" loading="lazy" />
                      <div className="flex-1"><div className="text-sm font-medium text-foreground">{conversation.upsell.title}</div><div className="text-xs text-muted-foreground">Suggested add-on · {formatPrice(conversation.upsell.price_paise)}</div></div>
                      <Button size="sm" className="h-7 rounded-full">Add to cart</Button>
                    </div>
                  </section>
                )}

                <Separator />

                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Shipping Details</h3>
                  <div className="mt-3">
                    {conversation.shipping_collected && conversation.shipping_address ? (
                      <div className="rounded-lg border bg-card p-3 text-sm leading-5">
                        <div className="font-medium text-foreground">{conversation.shipping_address.full_name}</div>
                        <div className="text-muted-foreground">{conversation.shipping_address.phone}</div>
                        <div className="text-muted-foreground">{conversation.shipping_address.line1}, {conversation.shipping_address.city}</div>
                        <Badge variant="success" className="mt-2 rounded-full">Collected</Badge>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">Shipping details not yet collected.</div>
                    )}
                  </div>
                </section>

                <Separator />

                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Conversation Timeline — Full Flow</h3>
                  <div className="relative mt-3 border-l pl-4 space-y-3">
                    {[
                      "Customer asked for a product",
                      "AI searched catalog",
                      "AI compared products",
                      "AI recommended a product",
                      "AI added item to cart",
                      "AI created Razorpay order",
                      "Customer approved payment",
                      conversation.status === "paid" || conversation.status === "completed" ? "Payment completed ✓" : "Payment pending",
                      conversation.status === "paid" || conversation.status === "completed" ? "Invoice generated ✓" : "Invoice not yet generated",
                      conversation.tracking_status?.includes("Shipped") || conversation.tracking_status === "Delivered" ? "Tracking started ✓" : "Tracking not started",
                    ].map((label, idx) => {
                      const done = !label.includes("not") && !label.includes("pending")
                      return (
                        <div key={idx} className="relative">
                          <span className={"absolute -left-[21px] top-0.5 size-2.5 rounded-full border-2 " + (done ? "bg-emerald-500 border-emerald-500" : "bg-card border-muted-foreground/30")} />
                          <div className={"text-xs " + (done ? "text-foreground" : "text-muted-foreground")}>{label}</div>
                        </div>
                      )
                    })}
                  </div>
                </section>

                <Separator />

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 flex-1 rounded-full bg-card"><CreditCard className="size-3.5" />Orders</Button>
                  <Button variant="outline" size="sm" className="h-8 flex-1 rounded-full bg-card"><Truck className="size-3.5" />Tracking</Button>
                  <Button variant="outline" size="sm" className="h-8 flex-1 rounded-full bg-card" onClick={() => { onClose(); setScreen("audit_placeholder") }}>Audit Trail</Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
