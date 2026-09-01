import { XIcon, PackageIcon, CreditCardIcon, TruckIcon } from "lucide-react"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatPrice } from "@/lib/types/order"
import type { Order } from "@/lib/types/order"

interface OrderDrawerProps {
  open: boolean
  onClose: () => void
  order?: Order | null
}

export default function OrderDrawer({ open, onClose, order }: OrderDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[420px] max-w-[92vw] overflow-y-auto p-0">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
          <h2 className="text-lg font-heading font-medium tracking-tight">Order Details</h2>
          <Button
            variant="outline"
            size="icon-sm"
            render={<a href="#" />}
            onClick={onClose}
            aria-label="Close"
          >
            <XIcon className="size-4" />
          </Button>
        </div>

        {!order ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            No order selected.
          </div>
        ) : (
          <div>
            <SheetHeader className="px-6 pt-5 pb-2 space-y-0.5">
              <SheetTitle className="text-base">{order.id}</SheetTitle>
              <SheetDescription className="text-xs">
                {order.status.toUpperCase()} · {new Date(order.created_at).toLocaleString()}
              </SheetDescription>
            </SheetHeader>

            <div className="px-6 space-y-6 pt-2">
              {/* Customer */}
              <section>
                <h3 className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-2">Customer</h3>
                <div className="text-sm text-foreground">
                  <p className="font-medium">{order.shipping_address.full_name}</p>
                  <p className="text-xs text-muted-foreground">{order.shipping_address.phone}</p>
                  <p className="text-xs text-muted-foreground">{order.shipping_address.email}</p>
                </div>
              </section>

              <Separator />

              {/* Shipping */}
              <section>
                <h3 className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-2">Shipping address</h3>
                <div className="text-sm text-muted-foreground leading-snug">
                  <p>{order.shipping_address.line1}</p>
                  {order.shipping_address.line2 ? <p>{order.shipping_address.line2}</p> : null}
                  <p>
                    {order.shipping_address.city}, {order.shipping_address.state}{" "}
                    {order.shipping_address.pincode}
                  </p>
                  <p className="text-xs">{order.shipping_address.country}</p>
                </div>
              </section>

              <Separator />

              {/* Items */}
              <section>
                <h3 className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-2">Order Items</h3>
                <div className="divide-y divide-border/50">
                  {order.items.map((item) => (
                    <div key={item.product_id} className="flex items-center gap-3 py-3">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-12 h-12 rounded-md object-cover ring-1 ring-border/40"
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground">Qty: {item.qty}</p>
                      </div>
                      <p className="text-sm font-medium tabular-nums whitespace-nowrap">{formatPrice(item.unit_price_paise * item.qty)}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Payment */}
              <section>
                <h3 className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-2">Payment</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span> <span className="font-medium">{order.status}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Razorpay order</span><span className="font-medium text-xs">{order.razorpay_order_id}</span></div>
                  {order.razorpay_payment_id ? (
                    <div className="flex justify-between"><span className="text-muted-foreground">Payment</span> <span className="font-medium text-xs">{order.razorpay_payment_id}</span></div>
                  ) : null}
                  <div className="flex justify-between pt-1"><span className="text-muted-foreground">Total</span> <span className="font-heading font-semibold">{formatPrice(order.total_paise)}</span></div>
                </div>
              </section>

              {/* Tracking */}
              {(order.shipping_status !== "pending" || (order.tracking?.events && order.tracking.events.length > 0)) ? (
                <>
                  <Separator />
                  <section>
                    <h3 className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-2">Shipping</h3>
                    <div className="text-sm space-y-1.5">
                      <div className="flex items-center gap-2">
                        <TruckIcon className="size-3.5 text-muted-foreground" />
                        <span>Carrier: <span className="font-medium">{order.tracking?.carrier ?? "Delhivery (simulated)"}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <PackageIcon className="size-3.5 text-muted-foreground" />
                        <span>Tracking: <span className="font-medium text-xs">{order.tracking?.tracking_number ?? "N/A"}</span></span>
                      </div>
                      <div className="text-xs text-muted-foreground">Status: <span className="font-medium capitalize">{order.shipping_status.replace(/_/g, " ")}</span></div>
                      {order.tracking?.events && order.tracking.events.length > 0 ? (
                        <ul className="mt-2 rounded-md border border-border/60 bg-card/40 divide-y divide-border/50">
                          {order.tracking.events.map((ev) => (
                            <li key={ev.at} className="flex items-center gap-2 px-3 py-2 text-xs">
                              <span className="inline-block size-1.5 rounded-full bg-primary/80 shrink-0" />
                              <span className="font-medium">{ev.status}</span>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-muted-foreground">{new Date(ev.at).toLocaleDateString()} · {ev.location}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </section>
                </>
              ) : null}

              {/* Timeline */}
              <section>
                <h3 className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-2">Timeline</h3>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div>Created · {new Date(order.created_at).toLocaleString()}</div>
                  {order.paid_at ? <div>Paid · {new Date(order.paid_at).toLocaleString()}</div> : null}
                  {order.shipped_at ? <div>Shipped · {new Date(order.shipped_at).toLocaleString()}</div> : null}
                  {order.delivered_at ? <div>Delivered · {new Date(order.delivered_at).toLocaleString()}</div> : null}
                </div>
              </section>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}