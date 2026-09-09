import { useState, useEffect } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import { ArrowLeft, Sparkles, ShieldCheck, Zap, HeartHandshake, CheckCircle2 } from "lucide-react"
import { LoginForm } from "@/components/login-form"
import { SignupForm } from "@/components/signup-form"
import { useCustomerAuth } from "@/state/useCustomerAuth"
import { Button } from "@/components/ui/button"

interface CustomerAuthPageProps {
  initialMode?: "login" | "signup"
}

export default function CustomerAuthPage({ initialMode }: CustomerAuthPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isInitialized } = useCustomerAuth()

  // Determine initial mode from props or path
  const isSignupPath = location.pathname.includes("signup")
  const [mode, setMode] = useState<"login" | "signup">(
    initialMode || (isSignupPath ? "signup" : "login"),
  )

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode)
    } else if (location.pathname.includes("signup")) {
      setMode("signup")
    } else {
      setMode("login")
    }
  }, [location.pathname, initialMode])

  // Redirect to store if already authenticated
  useEffect(() => {
    if (isInitialized && user) {
      // Check if there's a return url in state or default to /
      const returnUrl = (location.state as any)?.from || "/"
      navigate(returnUrl, { replace: true })
    }
  }, [user, isInitialized, navigate, location.state])

  const handleSuccess = () => {
    const returnUrl = (location.state as any)?.from || "/"
    navigate(returnUrl, { replace: true })
  }

  return (
    <div className="relative min-h-screen bg-muted/30 flex flex-col justify-between">
      {/* Background ambient accents */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 size-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 -right-40 size-96 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full border-b border-border/40 bg-background/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Store
        </Button>

        <Link to="/" className="flex items-center gap-2 group">
          <div className="size-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-md group-hover:scale-105 transition-transform">
            R
          </div>
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">
            Razent Store
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {mode === "login" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMode("signup")}
              className="text-xs font-medium"
            >
              Sign Up
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMode("login")}
              className="text-xs font-medium"
            >
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Hero & Perks Column (Desktop) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col space-y-8 pr-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
                <Sparkles className="size-3.5" />
                Customer Rewards & Fast Checkout
              </div>
              <h1 className="font-heading text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                Shop smarter with your Razent Customer Account.
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Unlock instant address prefill, realtime order tracking, seamless one-click returns, and member-exclusive deals.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3.5 p-3 rounded-xl bg-card border border-border/60 shadow-xs">
                <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Zap className="size-5" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-foreground">10-Minute Express Delivery</h2>
                  <p className="text-[11px] text-muted-foreground">Order fresh groceries, beverages, and daily essentials at lightning speed.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3 rounded-xl bg-card border border-border/60 shadow-xs">
                <div className="size-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-foreground">Secured via Supabase</h2>
                  <p className="text-[11px] text-muted-foreground">Encrypted sessions, multi-factor safety, and instant password recovery.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3 rounded-xl bg-card border border-border/60 shadow-xs">
                <div className="size-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <HeartHandshake className="size-5" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-foreground">Track All Orders in One Place</h2>
                  <p className="text-[11px] text-muted-foreground">Live updates on packaging, dispatch, delivery rider tracking, and receipts.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 pt-4 border-t border-border/60 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Zero spam</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Instant sign up</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Encrypted data</span>
              </div>
            </div>
          </div>

          {/* Right Form Card */}
          <div className="w-full lg:col-span-6 max-w-md mx-auto">
            {mode === "login" ? (
              <LoginForm
                onSuccess={handleSuccess}
                onSwitchToSignup={() => setMode("signup")}
              />
            ) : (
              <SignupForm
                onSuccess={handleSuccess}
                onSwitchToLogin={() => setMode("login")}
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-muted-foreground border-t border-border/40 bg-background/50">
        © {new Date().getFullYear()} Razent Inc. All rights reserved.
      </footer>
    </div>
  )
}
