import { useState } from "react"
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, KeyRound, Mail } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useCustomerAuth } from "@/state/useCustomerAuth"
import { EmailOtpVerification } from "@/components/customer/auth/EmailOtpVerification"

interface LoginFormProps extends React.ComponentProps<"div"> {
  onSuccess?: () => void
  onSwitchToSignup?: () => void
}

export function LoginForm({
  className,
  onSuccess,
  onSwitchToSignup,
  ...props
}: LoginFormProps) {
  const { signIn, signInWithOAuth, sendEmailOtp, resetPassword, isLoading } = useCustomerAuth()

  const [authMethod, setAuthMethod] = useState<"password" | "otp">("password")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [showResetPrompt, setShowResetPrompt] = useState(false)

  // OTP state
  const [otpSent, setOtpSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (authMethod === "otp") {
      if (!email.trim() || !email.includes("@")) {
        setFormError("Please enter a valid email address to receive your OTP.")
        return
      }

      setIsSubmitting(true)
      try {
        const { error } = await sendEmailOtp(email.trim())
        if (error) {
          setFormError(error.message || "Failed to send verification code.")
          toast.error("Failed to send code", { description: error.message })
        } else {
          setOtpSent(true)
          toast.success("Code sent!", {
            description: `We've emailed a 6-digit passcode to ${email.trim()}.`,
          })
        }
      } catch (err: any) {
        setFormError(err?.message || "An unexpected error occurred.")
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    // Password auth
    if (!email.trim() || !password) {
      setFormError("Please enter both your email and password.")
      return
    }

    setIsSubmitting(true)
    try {
      const { user, error } = await signIn({
        email: email.trim(),
        password,
      })

      if (error) {
        setFormError(error.message || "Failed to sign in. Please check your credentials.")
        toast.error("Sign in failed", {
          description: error.message || "Invalid email or password",
        })
      } else if (user) {
        toast.success("Welcome back!", {
          description: `Signed in as ${user.email}`,
        })
        onSuccess?.()
      }
    } catch (err: any) {
      setFormError(err?.message || "An unexpected error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOAuth = async (provider: "google" | "apple") => {
    setFormError(null)
    const { error } = await signInWithOAuth(provider)
    if (error) {
      toast.error(`${provider === "google" ? "Google" : "Apple"} sign-in`, {
        description: error.message || "Provider sign-in is not configured on this project.",
      })
    }
  }

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setFormError("Please enter your email address first to reset your password.")
      return
    }
    setIsSubmitting(true)
    setFormError(null)
    const { error } = await resetPassword(email.trim())
    setIsSubmitting(false)
    if (error) {
      toast.error("Password reset error", { description: error.message })
      setFormError(error.message)
    } else {
      setResetSent(true)
      toast.success("Password reset sent", {
        description: "Check your inbox for the password reset instructions.",
      })
    }
  }

  // If OTP has been sent, display the 6-digit passcode verification form
  if (otpSent) {
    return (
      <EmailOtpVerification
        email={email.trim()}
        onSuccess={onSuccess}
        onBackToEmail={() => setOtpSent(false)}
        className={className}
      />
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-border/60 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
          <CardDescription>
            Sign in to your customer account to track orders and checkout faster
          </CardDescription>

          {/* Auth Method Selector Toggle */}
          <div className="flex rounded-lg bg-muted/60 p-1 mt-3 text-xs border border-border/40">
            <button
              type="button"
              onClick={() => {
                setAuthMethod("password")
                setFormError(null)
              }}
              className={cn(
                "flex-1 py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1.5",
                authMethod === "password"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <KeyRound className="size-3.5" />
              Password
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod("otp")
                setFormError(null)
              }}
              className={cn(
                "flex-1 py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1.5",
                authMethod === "otp"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Mail className="size-3.5" />
              Email OTP
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0 rounded-full font-bold">
                Instant
              </span>
            </button>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {formError && (
                <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {resetSent && (
                <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                  <span>Password reset email has been dispatched to {email}.</span>
                </div>
              )}

              <Field>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    type="button"
                    disabled={isSubmitting || isLoading}
                    onClick={() => handleOAuth("apple")}
                    className="h-10 text-xs font-medium gap-2"
                  >
                    <svg className="size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                        fill="currentColor"
                      />
                    </svg>
                    Apple
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    disabled={isSubmitting || isLoading}
                    onClick={() => handleOAuth("google")}
                    className="h-10 text-xs font-medium gap-2"
                  >
                    <svg className="size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                        fill="currentColor"
                      />
                    </svg>
                    Google
                  </Button>
                </div>
              </Field>

              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                {authMethod === "otp" ? "Or sign in with 6-digit email OTP" : "Or continue with email"}
              </FieldSeparator>

              <Field>
                <FieldLabel htmlFor="login-email">Email Address</FieldLabel>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="customer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting || isLoading}
                  required
                  autoComplete="email"
                />
              </Field>

              {authMethod === "password" && (
                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="login-password">Password</FieldLabel>
                    <button
                      type="button"
                      onClick={() => {
                        setShowResetPrompt(!showResetPrompt)
                        if (!showResetPrompt) handleForgotPassword()
                      }}
                      className="text-xs text-primary underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting || isLoading}
                      required
                      autoComplete="current-password"
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </Field>
              )}

              <Field>
                <Button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="w-full h-10 font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      {authMethod === "otp" ? "Sending Passcode..." : "Signing In..."}
                    </>
                  ) : authMethod === "otp" ? (
                    "Send One-Time Passcode"
                  ) : (
                    "Sign In"
                  )}
                </Button>
                <FieldDescription className="text-center mt-2">
                  Don&apos;t have an account?{" "}
                  {onSwitchToSignup ? (
                    <button
                      type="button"
                      onClick={onSwitchToSignup}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Sign up
                    </button>
                  ) : (
                    <a
                      href="#/signup"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Sign up
                    </a>
                  )}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center text-xs">
        By continuing, you agree to our <a href="#/terms" className="underline hover:text-foreground">Terms of Service</a>{" "}
        and <a href="#/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
