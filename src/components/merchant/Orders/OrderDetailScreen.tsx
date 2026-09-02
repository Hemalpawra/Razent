"use client" /* Header */ /* Amount Paid */ /* Order Items */ /* Actions */ /* Customer Details */ /* Payment Details */ /* Order Timeline */ /* Bottom Actions */

import { useEffect } from "react"
import {
  ArrowLeft,
  FileTextIcon,
  UserIcon,
  MailIcon,
  PhoneIcon,
  CreditCardIcon,
  CheckIcon,
  CircleIcon,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useUI } from "@/state/useUI"
import { mockOrders } from "@/lib/mock/orders"
import { formatPrice } from "@/lib/types/order"

function formatPaid(paise: number) {
  const rupees = paise / 100
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees)
}

export default function OrderDetailScreen() {
  const setActiveScreen = useUI((s) => s.setActiveScreen)
  const drawerId = useUI((s) => s.drawerOrderId)
  const closeDrawer = useUI((s) => s.closeOrderDrawer)
  const order = drawerId
    ? (mockOrders.find((o) => o.id === drawerId) ?? null)
    : null

  const paymentMethod = order?.via_ai ? "UPI" : "Card"
  const paidOn = order?.paid_at
    ? new Date(order.paid_at).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—"

  const getTrackingLocation = (keyword: string) => {
    if (!order?.tracking?.events) return undefined
    const ev = order.tracking.events.find((e) =>
      e.status.toLowerCase().includes(keyword.toLowerCase()),
    )
    return ev?.location
  }

  const timeline = order
    ? [
        {
          label: "Order Created",
          done: true,
          at: order.created_at,
          location: undefined as string | undefined,
        },
        {
          label: "Payment Successful",
          done: !!order.paid_at,
          at: order.paid_at,
          location: undefined as string | undefined,
        },
        {
          label: "Invoice Generated",
          done: !!order.paid_at,
          at: order.paid_at,
          location: undefined as string | undefined,
        },
        {
          label: "Shipped",
          done: !!order.shipped_at,
          at: order.shipped_at,
          location:
            getTrackingLocation("shipped") ??
            getTrackingLocation("packed") ??
            undefined,
        },
        {
          label: "Delivered",
          done: !!order.delivered_at,
          at: order.delivered_at,
          location: getTrackingLocation("delivered") ?? undefined,
        },
      ]
    : []

  const handleBack = () => {
    closeDrawer()
    setActiveScreen("orders")
  }

  return (
    <div className="min-h-screen bg-background">
      {}
      <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="p-1"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <span className="text-sm font-medium capitalize">
          Order #{order?.id ?? "Details"}
        </span>
      </header>

      <div className="p-4">
        {!order ? (
          <Card className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No order selected. Please go back and select an order.
            </p>
            <Button variant="outline" onClick={handleBack} className="mt-4">
              Back to Orders
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {}
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Amount Paid
              </p>
              <p className="font-heading text-2xl font-bold tracking-tight mt-1">
                {formatPaid(order.total_paise)}
              </p>
            </Card>

            {}
            <Card className="p-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-3">
                Order Items
              </h3>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div
                    key={item.product_id}
                    className="flex items-center gap-3"
                  >
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="size-12 rounded-full object-cover ring-1 ring-border/40 shrink-0"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Qty: {item.qty}
                      </p>
                    </div>
                    <p className="text-sm font-medium tabular-nums whitespace-nowrap shrink-0">
                      {formatPrice(item.unit_price_paise * item.qty)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            {}
            <Button variant="default" className="w-full">
              <FileTextIcon className="size-4" />
              View Invoice
            </Button>

            <Separator />

            {}
            <Card className="p-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-3">
                Customer Details
              </h3>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <UserIcon className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">
                    {order.shipping_address.full_name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MailIcon className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">
                    {order.shipping_address.email}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <PhoneIcon className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">
                    {order.shipping_address.phone}
                  </span>
                </div>
              </div>
            </Card>

            {}
            <Card className="p-4">
              <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-3">
                <CreditCardIcon className="size-4 text-muted-foreground" />
                Payment Details
              </h3>
              <div className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment ID</span>
                  <span className="font-medium text-xs truncate max-w-[55%] text-right">
                    {order.razorpay_payment_id ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Razorpay Order ID
                  </span>
                  <span className="font-medium text-xs truncate max-w-[55%] text-right">
                    {order.razorpay_order_id}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment Method</span>
                  <span className="font-medium">{paymentMethod}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid On</span>
                  <span className="font-medium text-xs text-right">
                    {paidOn}
                  </span>
                </div>
              </div>
            </Card>

            {}
            <Card className="p-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-4">
                Order Timeline
              </h3>
              <div className="relative ml-4 border-l-2 border-border/60 pl-6 space-y-6">
                {timeline.map((step) => (
                  <div key={step.label} className="relative">
                    <span
                      className={
                        step.done
                          ? "absolute -left-[29px] top-0.5 flex size-5 items-center justify-center rounded-full bg-emerald-500 border border-emerald-500 text-white"
                          : "absolute -left-[29px] top-0.5 flex size-5 items-center justify-center rounded-full bg-muted border border-border text-muted-foreground"
                      }
                    >
                      {step.done ? (
                        <CheckIcon className="size-3" />
                      ) : (
                        <CircleIcon className="size-2.5" />
                      )}
                    </span>
                    <p className="text-sm font-medium leading-tight">
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {step.at
                        ? new Date(step.at).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "Pending"}
                    </p>
                    {step.location ? (
                      <p className="text-xs text-muted-foreground">
                        {step.location}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>

            {}
            <Card className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline">View Conversation</Button>
                <Button variant="outline">View Tracking</Button>
              </div>
              <Button variant="destructive" className="w-full">
                Refund Order
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
