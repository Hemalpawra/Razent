"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Bot, Send, User } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { useUI } from "@/state/useUI"
import { getConversation } from "@/lib/api/client"
import type { Conversation } from "@/lib/types/conversation"

export default function ConversationDetailScreen() {
  const setActiveScreen = useUI((s) => s.setActiveScreen)
  const closeDrawer = useUI((s) => s.closeOrderDrawer)
  const drawerId = useUI((s) => s.drawerOrderId)

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!drawerId) { setLoading(false); return }
    getConversation(drawerId)
      .then((c) => setConversation(c ?? null))
      .catch(() => setConversation(null))
      .finally(() => setLoading(false))
  }, [drawerId])

  const handleBack = () => {
    closeDrawer()
    setActiveScreen("ai_agent")
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="p-1 rounded-md hover:bg-muted/30"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium text-foreground">
          {conversation?.customer_name ?? "Conversation"}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">Active</span>
      </header>

      <div className="p-4 flex-1">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : !conversation ? (
          <Card className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              No conversation selected. Please go back to AI Agent.
            </p>
            <Button variant="outline" onClick={handleBack} className="mt-4">
              Back to AI Agent
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="p-4 border-b">
              <div className="flex items-center gap-3">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="size-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-foreground">
                      {conversation.customer_name}
                    </span>
                    <Badge
                      variant="default"
                      className="rounded-full px-2 py-0 text-[10px]"
                    >
                      {conversation.status}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Started {new Date(conversation.created_at).toLocaleDateString()}
                  </div>
                </div>
                <Badge variant="secondary" className="rounded-full text-[10px]">
                  {conversation.type === "agent_to_agent" ? "AI Agent" : "AI Assistant"}
                </Badge>
              </div>
            </Card>

            <div className="space-y-3">
              {conversation.messages?.map((msg, idx) => {
                const isCustomer = msg.role === "customer"
                return (
                  <Message
                    key={msg.id ?? idx}
                    align={isCustomer ? "end" : "start"}
                  >
                    <MessageAvatar>
                      <Avatar
                        className={`size-6 ${
                          isCustomer ? "bg-muted" : "bg-primary"
                        }`}
                      >
                        <AvatarFallback
                          className={
                            isCustomer
                              ? "bg-muted text-muted-foreground"
                              : "bg-primary text-primary-foreground"
                          }
                        >
                          {isCustomer ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
                        </AvatarFallback>
                      </Avatar>
                    </MessageAvatar>
                    <MessageContent
                      className={isCustomer ? "items-end" : "items-start"}
                    >
                      <Bubble
                        variant={isCustomer ? "muted" : "tinted"}
                        align={isCustomer ? "end" : "start"}
                      >
                        <BubbleContent>{msg.text}</BubbleContent>
                      </Bubble>
                      <span className="text-[10px] text-muted-foreground">
                        {msg.at
                          ? new Date(msg.at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </span>
                    </MessageContent>
                  </Message>
                )
              })}
            </div>

            <div className="flex gap-2 pt-3">
              <Input
                placeholder="Type a message…"
                className="flex-1 rounded-full bg-card h-10"
              />
              <Button size="icon" className="size-8 rounded-full bg-primary">
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
