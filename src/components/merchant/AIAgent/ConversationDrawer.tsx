"use client"

import {
  XIcon,
  Bot,
  User,
  Package,
  ShoppingCart,
  Phone,
  Mail,
  Calendar,
  IndianRupee,
  Clock,
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

interface ConversationDrawerProps {
  open: boolean
  onClose: () => void
  conversation: Conversation | null
  onStatusChange?: (newStatus: any) => void
}

function isActiveStatus(status: string) {
  return status === "active" || status === "waiting_for_customer" || status === "waiting_for_payment"
}

export default function ConversationDrawer({
  open,
  onClose,
  conversation,
}: ConversationDrawerProps) {
  const isMobile = useIsMobile()
  if (isMobile || !conversation) return null

  const isActive = isActiveStatus(conversation.status)
  const messages = conversation.messages || []
  const hasOrder = Boolean(conversation.order_id || (conversation.amount_paise && conversation.amount_paise > 0))

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="p-0 max-w-[540px] ml-auto h-full flex flex-col bg-card">
        {/* Single top-right close icon in DrawerHeader */}
        <DrawerHeader className="relative p-4 border-b shrink-0 pr-12">
          <div className="flex items-center gap-2">
            <DrawerTitle className="text-base font-semibold text-foreground">
              {conversation.customer_name || "Store Customer"}
            </DrawerTitle>
            <Badge
              variant={isActive ? "default" : "secondary"}
              className="text-[10px] px-2 py-0 h-5"
            >
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <DrawerDescription className="text-xs text-muted-foreground font-mono">
            ID: {conversation.id} · {conversation.type === "agent_to_agent" ? "Agent-to-Agent" : "Storefront AI"}
          </DrawerDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 size-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Close"
          >
            <XIcon className="size-4" />
          </Button>
        </DrawerHeader>

        <DrawerBody className="p-0 flex-1 flex flex-col overflow-hidden">
          <Tabs defaultValue="chat" className="flex-1 flex flex-col">
            <div className="border-b px-4 bg-muted/20">
              <TabsList className="bg-transparent h-10 p-0 gap-4">
                <TabsTrigger
                  value="chat"
                  className="rounded-none border-b-2 border-transparent px-2 py-2 text-xs font-medium data-[state=active]:border-primary data-[state=active]:text-foreground"
                >
                  Chat Messages ({messages.length})
                </TabsTrigger>
                <TabsTrigger
                  value="order"
                  className="rounded-none border-b-2 border-transparent px-2 py-2 text-xs font-medium data-[state=active]:border-primary data-[state=active]:text-foreground"
                >
                  Order Details {hasOrder ? "•" : ""}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab: Chat Messages */}
            <TabsContent value="chat" className="m-0 flex-1 p-4 overflow-y-auto space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <Bot className="size-8 mb-2 opacity-40" />
                  <p className="text-sm font-medium">No recorded chat messages.</p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    Latest activity: {conversation.last_message || "Session initiated"}
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isCustomer = msg.role === "customer" || (msg as any).sender === "user"
                  return (
                    <Message key={msg.id ?? idx} align={isCustomer ? "end" : "start"}>
                      <MessageAvatar>
                        <Avatar className="size-7 ring-1 ring-border/40">
                          <AvatarFallback
                            className={
                              isCustomer
                                ? "bg-muted text-foreground text-xs"
                                : "bg-primary text-primary-foreground text-xs"
                            }
                          >
                            {isCustomer ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
                          </AvatarFallback>
                        </Avatar>
                      </MessageAvatar>
                      <MessageContent className={isCustomer ? "items-end" : "items-start"}>
                        <Bubble
                          variant={isCustomer ? "default" : "muted"}
                          align={isCustomer ? "end" : "start"}
                          className="text-xs max-w-[85%]"
                        >
                          <BubbleContent>{msg.text}</BubbleContent>
                        </Bubble>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {msg.at
                            ? new Date(msg.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </span>
                      </MessageContent>
                    </Message>
                  )
                })
              )}
            </TabsContent>

            {/* Tab: Order & Session Details */}
            <TabsContent value="order" className="m-0 p-4 space-y-4 overflow-y-auto">
              <Card className="rounded-xl border shadow-none bg-card">
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="font-medium text-foreground">{conversation.customer_name || "Storefront User"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Channel</span>
                    <span className="capitalize text-foreground">{conversation.protocol || "Direct Web"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Order ID</span>
                    <span className="font-mono text-foreground font-medium">
                      {conversation.order_id || "No order linked"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Order Amount</span>
                    <span className="font-semibold text-foreground">
                      {conversation.amount_paise ? formatPrice(conversation.amount_paise) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Started At</span>
                    <span className="text-muted-foreground">
                      {conversation.created_at
                        ? new Date(conversation.created_at).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {hasOrder ? (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
                  <ShoppingCart className="size-4 shrink-0 text-emerald-600" />
                  <div>
                    <span className="font-semibold">Order Placed Successfully</span>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Order {conversation.order_id} was created for {conversation.amount_paise ? formatPrice(conversation.amount_paise) : ""}.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-muted/40 border p-4 text-center text-xs text-muted-foreground">
                  No purchase was finalized during this chat session.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  )
}
