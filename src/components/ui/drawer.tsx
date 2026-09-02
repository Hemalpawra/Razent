"use client"

import * as React from "react"
import { Dialog as DrawerPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Drawer({ ...props }: DrawerPrimitive.Root.Props) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />
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
    <DrawerPortal>
      <DrawerPrimitive.Popup
        data-slot="drawer-content"
        className={cn(
          "fixed right-0 top-0 h-full w-[25vw] min-w-[380px] max-w-[420px] z-50 flex flex-col bg-popover p-6 transition-opacity ease-in-out data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
          className
        )}
        {...props}
      >
        {children}
        <DrawerClose>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted/30"
          >
            <XIcon />
          </Button>
        </DrawerClose>
      </DrawerPrimitive.Popup>
    </DrawerPortal>
  )
}

function DrawerPortal({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

function DrawerClose({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("flex flex-col gap-2 p-0", className)}
      {...props}
    />
  )
}

function DrawerTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="drawer-title"
      className={cn("font-heading text-lg font-medium text-foreground", className)}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="drawer-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-0", className)}
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
  DrawerFooter,
}