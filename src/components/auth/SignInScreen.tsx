import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, Lock, ShieldCheck, ArrowRight, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useMerchant } from "@/state/useMerchant"

export default function SignInScreen() {
  const navigate = useNavigate()
  const { signInViewOnly, signInAdmin, isLoading } = useMerchant()

  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [adminError, setAdminError] = useState<string | null>(null)

  const handleViewOnlySignIn = () => {
    signInViewOnly()
    navigate("/admin/dashboard")
  }

  const handleAdminSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setAdminError(null)
    const result = signInAdmin(adminEmail, adminPassword)
    if (result.success) {
      navigate("/admin/dashboard")
    } else {
      setAdminError(result.error || "Invalid administrator credentials.")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4 sm:p-6">
      <Card className="w-full max-w-md rounded-2xl bg-card shadow-xl border-border/80">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="space-y-1.5 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md mb-3">
              <Store className="size-6" />
            </div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
              Merchant Sign In
            </h1>
            <p className="text-xs text-muted-foreground">
              Choose your merchant access level to enter the management console.
            </p>
          </div>

          {/* 1-Click View-only Merchant Card */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground">
                    View-only Merchant
                  </h2>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/30">
                    Live Data
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Browse products, orders, live AI conversations, audit trail, and analytics with full real-time database access.
                </p>
              </div>
            </div>

            <Button
              className="w-full h-10 rounded-lg gap-2 text-sm font-medium shadow-sm"
              onClick={handleViewOnlySignIn}
              disabled={isLoading}
            >
              <Eye className="size-4" />
              Sign in as View-only Merchant
              <ArrowRight className="size-4 ml-auto" />
            </Button>
          </div>

          {/* Protected & Separate Admin Login Section */}
          <div className="pt-2 border-t border-border/60">
            {!showAdminLogin ? (
              <Button
                variant="ghost"
                className="w-full h-9 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5"
                onClick={() => setShowAdminLogin(true)}
              >
                <Lock className="size-3.5" />
                Protected Admin Access
              </Button>
            ) : (
              <form onSubmit={handleAdminSignInSubmit} className="space-y-3 pt-2">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-primary" />
                    Admin Merchant Sign In
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] text-muted-foreground hover:text-foreground px-2"
                    onClick={() => {
                      setShowAdminLogin(false)
                      setAdminError(null)
                    }}
                  >
                    Cancel
                  </Button>
                </div>

                {adminError && (
                  <div className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive font-medium">
                    {adminError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Admin Email
                  </label>
                  <Input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="Enter admin email"
                    className="h-9 rounded-lg bg-card text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Password
                  </label>
                  <Input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter password"
                    className="h-9 rounded-lg bg-card text-xs"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  variant="outline"
                  className="w-full h-9 rounded-lg text-xs font-medium border-primary/30 text-primary hover:bg-primary/10"
                >
                  Authorize Admin Login
                </Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
