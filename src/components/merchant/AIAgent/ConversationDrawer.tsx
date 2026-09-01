import { XIcon, Bot, User, Package, CreditCard, Truck, FileText, Eye } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatPrice } from "@/lib/types/product"
import type { Conversation } from "@/lib/types/conversation"
import { mockOrders } from "@/lib/mock/orders"
import { useUI } from "@/state/useUI"

export default function ConversationDrawer({ open, onClose, conversation }: { open: boolean; onClose: () => void; conversation: Conversation | null }) {
  const setScreen = useUI((s) => s.setActiveScreen)
  const openOrderDrawer = useUI((s) => s.openOrderDrawer)
  const order = conversation?.order_id ? mockOrders.find((o) => o.id === conversation.order_id) ?? null : null

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[440px] max-w-[92vw] overflow-y-auto p-0">
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
            {/* Header */}
            <div className="px-6 pt-4 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">{conversation.type === "human_customer" ? <User className="size-4" /> : <Bot className="size-4" />}</div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{conversation.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{conversation.id} · {new Date(conversation.updated_at).toLocaleString()}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-full text-[11px]">{conversation.type === "human_customer" ? "Human Customer" : "Agent to Agent"}</Badge>
                <Badge variant={conversation.status === "paid" || conversation.status === "completed" ? "success" : conversation.status === "failed" ? "destructive" : conversation.status === "active" ? "default" : "warning"} className="rounded-full text-[11px] capitalize">{conversation.status.replace(/_/g, " ")}</Badge>
                {conversation.amount_paise ? <Badge variant="secondary" className="rounded-full text-[11px]">{formatPrice(conversation.amount_paise)}</Badge> : null}
              </div>
            </div>

            <Separator />

            {/* Chat timeline */}
            <section className="px-6 py-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Chat Timeline</h3>
              <div className="mt-3 space-y-3">
                {conversation.messages.map((m) => (
                  <div key={m.id} className={"flex gap-2 " + (m.role === "customer" ? "justify-start" : "justify-start")}>
                    <div className={"max-w-[85%] rounded-xl px-3 py-2 text-sm leading-5 " + (m.role === "customer" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground")}>
                      <div className="text-[11px] opacity-70 mb-1">{m.role === "customer" ? "Customer" : "AI"} · {new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <Separator />

            {/* Products */}
            {conversation.products_recommended.length > 0 && (
              <>
                <section className="px-6 py-4">
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
                <Separator />
              </>
            )}

            {conversation.products_compared.length > 0 && (
              <>
                <section className="px-6 py-4">
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
                <Separator />
              </>
            )}

            {conversation.selected_product && (
              <>
                <section className="px-6 py-4">
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Selected Product</h3>
                  <div className="mt-3 flex items-center gap-3 rounded-xl border bg-primary/5 p-3">
                    <img src={conversation.selected_product.image_url} alt={conversation.selected_product.title} className="size-12 rounded-lg object-cover" loading="lazy" />
                    <div><div className="text-sm font-semibold text-foreground">{conversation.selected_product.title}</div><div className="text-xs text-muted-foreground">{formatPrice(conversation.selected_product.price_paise)}</div></div>
                    <Badge variant="success" className="ml-auto rounded-full">Selected</Badge>
                  </div>
                </section>
                <Separator />
              </>
            )}

            {conversation.upsell && (
              <>
                <section className="px-6 py-4">
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Upsell / Cross-sell</h3>
                  <div className="mt-3 flex items-center gap-3 rounded-lg border bg-amber-500/5 p-3">
                    <img src={conversation.upsell.image_url} alt={conversation.upsell.title} className="size-10 rounded-md object-cover" loading="lazy" />
                    <div className="flex-1"><div className="text-sm font-medium text-foreground">{conversation.upsell.title}</div><div className="text-xs text-muted-foreground">Suggested add-on · {formatPrice(conversation.upsell.price_paise)}</div></div>
                    <Button size="sm" className="h-7 rounded-full">Add to cart</Button>
                  </div>
                </section>
                <Separator />
              </>
            )}

            {/* Shipping */}
            <section className="px-6 py-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Shipping Details</h3>
              <div className="mt-2 text-sm">
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

            {/* Related order / invoice / tracking */}
            <section className="px-6 py-4 space-y-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Related Order & Tracking</h3>
              {order ? (
                <div className="rounded-xl border bg-card p-3">
                  <div className="flex items-center gap-2 text-sm"><Package className="size-4 text-muted-foreground" /><span className="font-medium text-foreground">{order.id}</span><Badge variant={order.status === "paid" ? "success" : "secondary"} className="ml-auto rounded-full text-[11px] capitalize">{order.status}</Badge></div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 rounded-full bg-card" onClick={() => { onClose(); openOrderDrawer(order.id); setScreen("orders") }}><Eye className="size-3.5" /> View Order</Button>
                    <Button size="sm" variant="outline" className="h-7 rounded-full bg-card"><FileText className="size-3.5" /> Invoice</Button>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Truck className="size-3.5" />{conversation.tracking_status ?? order.tracking?.carrier ?? "No tracking yet"}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Paid on {order.paid_at ? new Date(order.paid_at).toLocaleString() : "—"}</div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">No order linked yet. Order will appear after checkout.</div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 flex-1 rounded-full bg-card" onClick={() => { onClose(); setScreen("orders") }}><CreditCard className="size-3.5" />Orders</Button>
                <Button variant="outline" size="sm" className="h-8 flex-1 rounded-full bg-card"><Truck className="size-3.5" />Tracking</Button>
                <Button variant="outline" size="sm" className="h-8 flex-1 rounded-full bg-card" onClick={() => { onClose(); setScreen("audit_placeholder") }}>Audit Trail</Button>
              </div>
            </section>

            <Separator />

            {/* Conversation Timeline full flow */}
            <section className="px-6 py-4">
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

            <div className="h-6" />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
