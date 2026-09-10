import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useClerk, useUser } from "@clerk/react"
import { User, LogOut, PackageCheck, Shield, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface CustomerProfileMenuProps {
  onOpenTrackOrder?: () => void
}

export function CustomerProfileMenu({ onOpenTrackOrder }: CustomerProfileMenuProps) {
  const navigate = useNavigate()
  const { user, isSignedIn } = useUser()
  const { signOut } = useClerk()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  if (!isSignedIn || !user) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate("/login")}
        className="relative"
        title="Sign In / Register"
      >
        <User className="size-5" />
      </Button>
    )
  }

  const displayName =
    user.fullName ||
    user.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "Customer"

  const initials = displayName
    .split(" ")
    .map((s: string) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "C"

  const handleSignOut = async () => {
    setIsOpen(false)
    await signOut({ redirectUrl: "/" })
    toast.success("Signed out", {
      description: "You have been signed out of your customer account.",
    })
  }

  const handleTrackOrders = () => {
    setIsOpen(false)
    if (onOpenTrackOrder) {
      onOpenTrackOrder()
    } else {
      navigate("/?view=track-order")
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full hover:bg-accent/60 transition-colors border border-border/50 text-left focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={isOpen}
      >
        <div className="size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-xs">
          {initials}
        </div>
        <span className="hidden sm:inline-block text-xs font-medium max-w-[90px] truncate text-foreground">
          {displayName}
        </span>
        <ChevronDown className="size-3 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-card p-3 shadow-xl z-50 animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="flex items-start gap-3 pb-3 border-b border-border/60">
            <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-foreground truncate">{displayName}</p>
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                  Customer
                </Badge>
              </div>
          <p className="text-[11px] text-muted-foreground truncate">{user.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>

          <div className="py-2 space-y-1">
            <button
              type="button"
              onClick={handleTrackOrders}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-foreground rounded-lg hover:bg-accent transition-colors text-left"
            >
              <PackageCheck className="size-4 text-primary" />
              <span>Track My Orders</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                navigate("/signin")
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-muted-foreground rounded-lg hover:bg-accent hover:text-foreground transition-colors text-left"
            >
              <Shield className="size-4 text-muted-foreground" />
              <span>Merchant Console</span>
            </button>
          </div>

          <div className="pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-destructive rounded-lg hover:bg-destructive/10 transition-colors text-left font-medium"
            >
              <LogOut className="size-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
