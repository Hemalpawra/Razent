"use client"

import {
  XIcon,
  Bot,
  Star,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  Search,
  Package,
  ShoppingCart,
  CreditCard,
  Link2,
  Truck,
  FileCheck,
  MapPin,
  Phone,
  User,
  Sparkles,
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
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { formatPrice } from "@/lib/types/product"
import type { Conversation } from "@/lib/types/conversation"
import { useIsMobile } from "@/hooks/use-mobile"

const PRODUCTS = [
  {
    id: "p1",
    name: "Air Purifier Pro",
    subtitle: "HEPA-13 · 99.97% removal · App control",
    price: 1699900,
    rating: 4.8,
    img: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=240&q=70&auto=format&fit=crop",
    added: true,
  },
  {
    id: "p2",
    name: "CleanAir X1",
    subtitle: "Compact · 360° intake · Sleep mode",
    price: 1499900,
    rating: 4.6,
    img: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=240&q=70&auto=format&fit=crop",
    added: false,
  },
  {
    id: "p3",
    name: "PureSense 300",
    subtitle: "Smart sensing · Auto mode · Filter alert",
    price: 1899900,
    rating: 4.7,
    img: "https://images.unsplash.com/photo-1581578017093-cd30fce4f9d1?w=240&q=70&auto=format&fit=crop",
    added: false,
  },
]

const FBT = [
  {
    name: "HEPA Filter Replacement",
    price: 129900,
    img: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=120&q=70&auto=format&fit=crop",
  },
  {
    name: "Activated Carbon Filter",
    price: 79900,
    img: "https://images.unsplash.com/photo-1559666126-84f389727b9a?w=120&q=70&auto=format&fit=crop",
  },
  {
    name: "Air Quality Monitor",
    price: 249900,
    img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=120&q=70&auto=format&fit=crop",
  },
]

const TIMELINE_STEPS = [
  {
    label: "Conversation Started",
    sub: "Customer initiated chat",
    time: "10:24 AM",
    done: true,
    icon: Sparkles,
  },
  {
    label: "Products Searched",
    sub: "AI searched catalog for air purifier < ₹20k",
    time: "10:25 AM",
    done: true,
    icon: Search,
  },
  {
    label: "Products Recommended",
    sub: "3 products shown in chat",
    time: "10:25 AM",
    done: true,
    icon: Package,
  },
  {
    label: "Product Added to Cart",
    sub: "Air Purifier Pro added · Qty 1",
    time: "10:27 AM",
    done: true,
    icon: ShoppingCart,
  },
  {
    label: "Order Created",
    sub: "Razorpay Order rzp_…AB12CD created",
    time: "10:28 AM",
    done: true,
    icon: FileCheck,
  },
  {
    label: "Payment Link Shared",
    sub: "Link sent to customer",
    time: "10:28 AM",
    done: true,
    icon: Link2,
  },
  {
    label: "Payment Pending",
    sub: "Awaiting customer payment",
    time: "—",
    done: false,
    pending: true,
    icon: CreditCard,
  },
  {
    label: "Shipping Pending",
    sub: "Address collected, shipment not started",
    time: "—",
    done: false,
    icon: Truck,
  },
  {
    label: "Order Completed",
    sub: "Will mark paid and start tracking",
    time: "—",
    done: false,
    icon: CheckCircle2,
  },
]

export default function ConversationDrawer({
  open,
  onClose,
  conversation,
  onStatusChange,
}: {
  open: boolean
  onClose: () => void
  conversation: Conversation | null
  onStatusChange?: (status: "active" | "completed") => void
}) {
  const isMobile = useIsMobile()

  const displayName = conversation?.customer_name ?? "AI Conversation"
  const displayType = conversation?.type === "agent_to_agent" ? "AI Agent" : "AI Assistant"
  const displayStatus = conversation?.status ?? "active"
  const displayStarted = conversation?.created_at
    ? new Date(conversation.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    : "—"
  const messages = conversation?.messages ?? []

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="p-0">
        <DrawerHeader className="p-4 border-b">
          <div className="flex items-center justify-between pr-8">
            <div>
              <DrawerTitle className="text-lg font-heading font-medium tracking-tight">
                Conversation Details
              </DrawerTitle>
              <DrawerDescription>Session #{conversation?.id}</DrawerDescription>
            </div>
            {conversation && onStatusChange && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs rounded-full"
                onClick={() =>
                  onStatusChange(
                    conversation.status === "active" ? "completed" : "active",
                  )
                }
              >
                {conversation.status === "active" ? "Mark Resolved" : "Reopen"}
              </Button>
            )}
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

        <DrawerBody className="p-4 space-y-4">
          <div className="border-b bg-card px-4 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
                {displayName}
              </h2>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1"
              >
                <XIcon className="size-4" />
              </Button>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Avatar className="size-9">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot className="size-5" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {displayName}
                  </span>
                  <Badge
                    variant={displayStatus === "active" ? "success" : "secondary"}
                    className="rounded-full px-2 py-0 text-[11px]"
                  >
                    {displayStatus}
                  </Badge>
                </div>
                <div className="text-[11px] leading-4 text-muted-foreground">
                  Started {displayStarted}
                </div>
              </div>
              <Badge variant="secondary" className="rounded-full text-[11px]">
                {displayType}
              </Badge>
            </div>
          </div>

          <Tabs
            defaultValue="conversation"
            className="flex flex-1 min-h-0 flex-col"
          >
            <div className="shrink-0 px-4 pt-3 bg-card">
              <TabsList className="w-full justify-start gap-5 bg-transparent p-0 h-auto rounded-none border-b">
                <TabsTrigger
                  value="conversation"
                  className="rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-1 -mb-px bg-transparent shadow-none text-xs font-medium data-[selected]:border-primary data-[selected]:text-foreground aria-[selected=true]:border-primary aria-[selected=true]:text-foreground text-muted-foreground"
                >
                  Conversation
                </TabsTrigger>
                <TabsTrigger
                  value="products"
                  className="rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-1 -mb-px bg-transparent shadow-none text-xs font-medium data-[selected]:border-primary data-[selected]:text-foreground aria-[selected=true]:border-primary text-muted-foreground"
                >
                  Products
                </TabsTrigger>
                <TabsTrigger
                  value="order"
                  className="rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-1 -mb-px bg-transparent shadow-none text-xs font-medium data-[selected]:border-primary data-[selected]:text-foreground aria-[selected=true]:border-primary text-muted-foreground"
                >
                  Order
                </TabsTrigger>
                <TabsTrigger
                  value="timeline"
                  className="rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-1 -mb-px bg-transparent shadow-none text-xs font-medium data-[selected]:border-primary data-[selected]:text-foreground aria-[selected=true]:border-primary text-muted-foreground"
                >
                  Timeline
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto">
              <TabsContent
                value="conversation"
                className="m-0 px-4 py-4 space-y-4"
              >
                <div className="flex flex-col gap-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                      <Bot className="size-8 mb-2 opacity-40" />
                      <p className="text-sm">No messages in this conversation yet.</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isCustomer = msg.role === "customer"
                      return (
                        <Message key={msg.id ?? idx} align={isCustomer ? "end" : "start"}>
                          <MessageAvatar>
                            <Avatar className="size-7">
                              <AvatarFallback className={isCustomer ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"}>
                                {isCustomer ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
                              </AvatarFallback>
                            </Avatar>
                          </MessageAvatar>
                          <MessageContent className={isCustomer ? "items-end" : "items-start"}>
                            <Bubble variant={isCustomer ? "muted" : "tinted"} align={isCustomer ? "end" : "start"}>
                              <BubbleContent>{msg.text}</BubbleContent>
                            </Bubble>
                            <span className="text-[10px] text-muted-foreground">
                              {msg.at ? new Date(msg.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                            </span>
                          </MessageContent>
                        </Message>
                      )
                    })
                  )}
                </div>
              </TabsContent>

              <TabsContent value="products" className="m-0 px-4 py-4 space-y-4">
                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Recommended Products
                  </h3>
                  <div className="mt-2 grid gap-2">
                    {PRODUCTS.map((p) => (
                      <Card key={p.id} className="rounded-xl bg-card p-3">
                        <div className="flex gap-3">
                          <img
                            src={p.img}
                            alt={p.name}
                            className="size-12 rounded-lg object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-foreground">
                              {p.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {p.subtitle}
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">
                                {formatPrice(p.price)}
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                                <Star className="size-3 fill-amber-500" />
                                {p.rating}
                              </span>
                            </div>
                          </div>
                          <Badge
                            variant={p.added ? "success" : "secondary"}
                            className="h-6 shrink-0 rounded-full"
                          >
                            {p.added ? "Added" : "View"}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Frequently Bought Together
                  </h3>
                  <div className="mt-2 divide-y divide-border/50 rounded-xl border bg-card">
                    {FBT.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center gap-3 px-3 py-2.5"
                      >
                        <img
                          src={item.img}
                          alt={item.name}
                          className="size-9 rounded-md object-cover ring-1 ring-border/40"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium leading-4 text-foreground">
                            {item.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatPrice(item.price)}
                          </div>
                        </div>
                        <Button
                          size="icon-sm"
                          variant="outline"
                          className="size-7 rounded-full bg-card"
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="order" className="m-0 px-4 py-4 space-y-4">
                <Card className="rounded-xl bg-card overflow-hidden">
                  <div className="px-3 py-3 flex items-center gap-2 border-b">
                    <img
                      src={PRODUCTS[0].img}
                      alt={PRODUCTS[0].name}
                      className="size-10 rounded-lg object-cover"
                    />
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {PRODUCTS[0].name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Qty 1 · {formatPrice(PRODUCTS[0].price)}
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium text-foreground tabular-nums">
                        {formatPrice(1699900)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="font-medium text-emerald-600">Free</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Tax (18% GST)
                      </span>
                      <span className="font-medium text-foreground tabular-nums">
                        {formatPrice(305982)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-[15px]">
                      <span className="font-semibold text-foreground">
                        Total
                      </span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {formatPrice(2005882)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-xl bg-card p-4">
                  <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-muted-foreground" />
                    Shipping Details
                  </h3>
                  <div className="mt-2 space-y-1 text-sm leading-5">
                    <div className="flex items-center gap-2">
                      <User className="size-3.5 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        Ananya Rao
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        +91 98765 43210
                      </span>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="timeline" className="m-0 px-4 py-4">
                <div className="relative pl-4">
                  <div className="absolute left-[11px] top-2 bottom-4 w-px bg-border" />
                  <div className="space-y-4">
                    {TIMELINE_STEPS.map((step) => {
                      const Icon = step.icon
                      const color = step.done
                        ? "bg-emerald-500 text-white border-emerald-500"
                        : (step as any).pending
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-card text-muted-foreground border-border"
                      const dotInner = step.done ? (
                        <CheckCircle2 className="size-3.5" />
                      ) : (
                        <Icon className="size-3.5" />
                      )
                      return (
                        <div key={step.label} className="relative flex gap-3">
                          <div
                            className={
                              "absolute -left-6 flex size-6 items-center justify-center rounded-full border-2 " +
                              color
                            }
                          >
                            {dotInner}
                          </div>
                          <div className="flex-1 rounded-xl border bg-card p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {step.label}
                              </span>
                              {step.done ? (
                                <Badge
                                  variant="success"
                                  className="ml-auto rounded-full text-[10px]"
                                >
                                  Done
                                </Badge>
                              ) : (step as any).pending ? (
                                <Badge
                                  variant="warning"
                                  className="ml-auto rounded-full text-[10px]"
                                >
                                  Pending
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="ml-auto rounded-full text-[10px]"
                                >
                                  Queued
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs leading-4 text-muted-foreground">
                              {step.sub}
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Clock className="size-3" />
                              {step.time}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <div className="mt-4 flex gap-2 border-t border-border/60 pt-4">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-full bg-card text-xs"
            >
              View Full Conversation
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-full bg-card text-xs"
            >
              Export Chat
            </Button>
            <Button size="sm" className="flex-1 rounded-full text-xs">
              Take Over
            </Button>
          </div>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  )
}
