import * as React from "react"
import { cn } from "@/lib/utils"

function Bubble({
  variant = "default",
  align = "start",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "default" | "secondary" | "muted" | "tinted" | "outline" | "ghost"
  align?: "start" | "end"
}) {
  const variants: Record<string, string> = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    muted: "bg-muted text-foreground",
    tinted: "bg-primary/10 text-foreground border border-primary/20",
    outline: "border bg-card text-foreground",
    ghost: "bg-transparent text-foreground",
  }
  return (
    <div
      data-slot="bubble"
      data-variant={variant}
      data-align={align}
      className={cn(
        "rounded-2xl px-3.5 py-2.5 text-sm leading-5 max-w-[80%]",
        variants[variant],
        align === "end" ? "rounded-br-sm" : "rounded-bl-sm",
        className,
      )}
      {...props}
    />
  )
}
function BubbleContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="bubble-content" className={cn("", className)} {...props} />
  )
}
function BubbleGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bubble-group"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  )
}
export { Bubble, BubbleContent, BubbleGroup }
