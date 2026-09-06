"use client"

// derive timeline

import { useState } from "react"
import {
  XIcon,
  FileTextIcon,
  UserIcon,
  MailIcon,
  PhoneIcon,
  CreditCardIcon,
  CheckIcon,
  CircleIcon,
} from "lucide-react"

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
  DrawerFooter,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useIsMobile } from "@/hooks/use-mobile"
import { formatPrice } from "@/lib/types/order"
import type { Order } from "@/lib/types/order"
import { useMerchant } from "@/state/useMerchant"
import { toast } from "sonner"
import { refundOrder } from "@/lib/api/client"

interface OrderDrawerProps {
  open: boolean
  onClose: () => void
  order?: Order | null
}

function formatPaid(paise: number) {
  const rupees =
    paise /
    100
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees)
}

export default function OrderDrawer({
  open,
  onClose,
  order,
}: OrderDrawerProps) {
  const isMobile = useIsMobile()
  const { role, hasPermission } = useMerchant()
  const canRefund = hasPermission("refund_orders")
  const [isRefunding, setIsRefunding] = useState(false)

  const handleViewConversation = () => {
    if (role === "view_only") {
      toast.info("You are using the view-only merchant account. Conversation details are restricted.")
      return
    }
    onClose()
    useUI.getState().setActiveScreen("ai_agent")
    window.location.hash = "#/merchant/ai_agent"
  }

  const handleViewTracking = () => {
    if (!order?.id) return
    window.open(`/#/?track=${order.id}`, "_blank")
  }

  const handleRefund = async () => {
    if (!order) return
    if (!canRefund) {
      toast.error("You do not have permission to refund orders.")
      return
    }
    if (order.status === "refunded") {
      toast.info("This order has already been refunded.")
      return
    }
    setIsRefunding(true)
    try {
      const ok = await refundOrder(order.id)
      if (ok) {
        toast.success(`Order #${order.id} refunded successfully`)
        onClose()
      } else {
        toast.error("Failed to refund order. Please try again.")
      }
    } finally {
      setIsRefunding(false)
    }
  }

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

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <div className="flex items-center justify-between pr-8">
            <div>
              <DrawerTitle>Order Details</DrawerTitle>
              <DrawerDescription>Order #{order?.id}</DrawerDescription>
            </div>
          </div>
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

        <DrawerBody>
          {!order ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No order selected.
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="sr-only">{order.id} details</span>

              <section className="px-6 py-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-3">
                  Order Items
                </h3>
                <div className="rounded-md border border-border/50 divide-y divide-border/50 overflow-hidden bg-card/20">
                  {order.items.map((item) => (
                    <div
                      key={item.product_id}
                      className="flex items-center gap-3 px-3 py-3"
                    >
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="size-10 rounded-full object-cover ring-1 ring-border/40 shrink-0"
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {item.product_id}
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
              </section>

              <Separator />

              <section className="px-6 py-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Amount Paid
                </p>
                <p className="font-heading text-2xl font-bold tracking-tight mt-1">
                  {formatPaid(order.total_paise)}
                </p>
              </section>

              <Separator />

              <section className="px-6 py-4">
                <Button variant="default" className="w-full">
                  <FileTextIcon className="size-4" />
                  View Invoice
                </Button>
              </section>

              <Separator />

              <section className="px-6 py-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-3">
                  Customer Details
                </h3>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <UserIcon className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm">
                      {order.shipping_address.full_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MailIcon className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">
                      {order.shipping_address.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm">
                      {order.shipping_address.phone}
                    </span>
                  </div>
                </div>
              </section>

              <Separator />

              <section className="px-6 py-4">
                <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-3">
                  <CreditCardIcon className="size-3.5 text-muted-foreground" />
                  Payment Details
                </h3>
                <div className="space-y-2.5">
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Payment ID</span>
                    <span className="font-medium text-xs truncate max-w-[55%] text-right">
                      {order.razorpay_payment_id ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">
                      Razorpay Order ID
                    </span>
                    <span className="font-medium text-xs truncate max-w-[55%] text-right">
                      {order.razorpay_order_id}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">
                      Payment Method
                    </span>
                    <span className="font-medium">{paymentMethod}</span>
                  </div>
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Paid On</span>
                    <span className="font-medium text-xs text-right">
                      {paidOn}
                    </span>
                  </div>
                </div>
              </section>

              <Separator />

              <section className="px-6 py-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-4">
                  Order Timeline
                </h3>
                <div className="relative ml-3 border-l border-border/60 pl-6 space-y-6">
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
              </section>

              <Separator />

              <section className="px-6 py-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={handleViewConversation}>
                    View Conversation
                  </Button>
                  <Button variant="outline" onClick={handleViewTracking}>
                    View Tracking
                  </Button>
                </div>
                <Button
                  variant={order.status === "refunded" ? "secondary" : "default"}
                  className="w-full bg-primary"
                  disabled={isRefunding || order.status === "refunded"}
                  onClick={handleRefund}
                >
                  {isRefunding
                    ? "Processing Refund..."
                    : order.status === "refunded"
                      ? "Order Refunded"
                      : "Refund Order"}
                </Button>
              </section>
            </div>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  )
}
