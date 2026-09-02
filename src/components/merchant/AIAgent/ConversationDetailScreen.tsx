"use client" /* Header - ChatGPT style */ /* Conversation header */ /* Messages */ /* Input at bottom */ // reuse for screen tracking

import { ArrowLeft } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useUI } from "@/state/useUI"
import { mockConversations } from "@/lib/mock/conversations"
import { formatPrice } from "@/lib/types/product"

export default function ConversationDetailScreen() {
  const setActiveScreen = useUI((s) => s.setActiveScreen)
  const drawerProductId = useUI((s) => s.drawerOrderId)
  const closeDrawer = useUI((s) => s.closeOrderDrawer)

  const conversation = mockConversations[0] ?? null

  const handleBack = () => {
    closeDrawer()
    setActiveScreen("ai_agent")
  }

  return (
    <div className="min-h-screen bg-background">
      {}
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur bg-white">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="p-1 rounded-md hover:bg-muted/30"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium text-foreground">
          {conversation?.title ?? "Chat"}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">Active</span>
      </header>

      <div className="p-4 flex-1">
        {!conversation ? (
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
            {}
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
                      {conversation.title}
                    </span>
                    <Badge
                      variant="success"
                      className="rounded-full px-2 py-0 text-[10px]"
                    >
                      Active
                    </Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Started {conversation.started_at ?? "Today"}
                  </div>
                </div>
                <Badge variant="secondary" className="rounded-full text-[10px]">
                  AI Assistant
                </Badge>
              </div>
            </Card>

            {}
            <div className="space-y-3">
              {conversation.messages?.map((msg, idx) => (
                <Message
                  key={idx}
                  align={msg.role === "user" ? "end" : "start"}
                >
                  <MessageAvatar>
                    <Avatar
                      className={`size-6 ${
                        msg.role === "user" ? "bg-muted" : "bg-primary"
                      }`}
                    >
                      <AvatarFallback
                        className={`bg-${
                          msg.role === "user"
                            ? "text-muted-foreground"
                            : "text-primary-foreground"
                        } ${msg.role === "user" ? "User" : "Bot"}`}
                      />
                    </Avatar>
                  </MessageAvatar>
                  <MessageContent
                    className={
                      msg.role === "start" ? "items-start" : "items-end"
                    }
                  >
                    <Bubble
                      variant={msg.role === "user" ? "muted" : "tinted"}
                      align={msg.role === "user" ? "end" : "start"}
                    >
                      <BubbleContent>{msg.content}</BubbleContent>
                    </Bubble>
                    <span className="text-[10px] text-muted-foreground">
                      {msg.time ?? "—"}
                    </span>
                  </MessageContent>
                </Message>
              ))}
            </div>

            {}
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
