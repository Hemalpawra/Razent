"use client"

import * as React from "react"
import { Dialog as DrawerPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Drawer({ ...props }: DrawerPrimitive.Root.Props) {
  // Non-modal drawer per shadcn base-ui spec: main page stays interactive
  return <DrawerPrimitive.Root data-slot="drawer" modal={false} {...props} />
}

function DrawerTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerContent({
  className,
  children,
  ...props
}: DrawerPrimitive.Popup.Props & {
  className?: string
}) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Popup
        data-slot="drawer-content"
        className={cn(
          "fixed right-0 top-0 h-full w-[25vw] min-w-[380px] max-w-[420px] z-40 flex flex-col bg-popover text-popover-foreground border-l border-border overflow-hidden",
          "transition-transform duration-200 ease-in-out",
          "data-[state=open]:translate-x-0 data-[state=closed]:translate-x-full",
          className,
        )}
        {...props}
      >
        {children}
      </DrawerPrimitive.Popup>
    </DrawerPrimitive.Portal>
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("flex flex-col gap-2 p-0 shrink-0", className)}
      {...props}
    />
  )
}

function DrawerTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="drawer-title"
      className={cn(
        "font-heading text-lg font-medium text-foreground",
        className,
      )}
      {...props}
    />
  )
}

function DrawerDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="drawer-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function DrawerBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-body"
      className={cn("flex-1 overflow-y-auto", className)}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-0 shrink-0", className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
  DrawerFooter,
}
