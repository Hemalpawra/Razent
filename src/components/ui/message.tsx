import * as React from "react"
import { cn } from "@/lib/utils"

function Message({ align = "start", className, ...props }: React.ComponentProps<"div"> & { align?: "start" | "end" }) {
  return <div data-slot="message" data-align={align} className={cn("flex gap-3", align === "end" ? "flex-row-reverse" : "flex-row", className)} {...props} />
}
function MessageAvatar({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="message-avatar" className={cn("flex size-8 shrink-0 items-start pt-0.5", className)} {...props} />
}
function MessageContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="message-content" className={cn("flex flex-1 flex-col gap-1", className)} {...props} />
}
function MessageHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="message-header" className={cn("text-xs font-medium text-muted-foreground", className)} {...props} />
}
function MessageFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="message-footer" className={cn("text-[11px] text-muted-foreground", className)} {...props} />
}
function MessageGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="message-group" className={cn("flex flex-col gap-4", className)} {...props} />
}
export { Message, MessageAvatar, MessageContent, MessageHeader, MessageFooter, MessageGroup }
