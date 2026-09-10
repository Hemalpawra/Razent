import { useState } from "react"
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
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
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useCustomerAuth } from "@/state/useCustomerAuth"

interface SignupFormProps extends React.ComponentProps<"div"> {
  onSuccess?: () => void
  onSwitchToLogin?: () => void
}

export function SignupForm({
  className,
  onSuccess,
  onSwitchToLogin,
  ...props
}: SignupFormProps) {
  const { signUp, isLoading } = useCustomerAuth()

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSignupSuccess(null)

    if (!fullName.trim()) {
      setFormError("Please enter your full name.")
      return
    }

    if (!email.trim() || !email.includes("@")) {
      setFormError("Please provide a valid email address.")
      return
    }

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters long.")
      return
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match. Please re-enter them.")
      return
    }

    setIsSubmitting(true)
    try {
      const { user, session, error } = await signUp({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
      })

      if (error) {
        setFormError(error.message || "Failed to create account.")
        toast.error("Sign up failed", {
          description: error.message,
        })
      } else if (user) {
        if (session) {
          toast.success("Account created!", {
            description: `Welcome to Razent, ${fullName.trim()}!`,
          })
          onSuccess?.()
        } else {
          setSignupSuccess(
            "Account created! Please check your email to verify your address before signing in.",
          )
          toast.info("Verification email sent", {
            description: "Please check your inbox to confirm your account.",
          })
        }
      }
    } catch (err: any) {
      setFormError(err?.message || "An unexpected error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-border/60 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
          <CardDescription>
            Join Razent to enjoy express checkout, rewards, and order tracking
          </CardDescription>

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

              {signupSuccess && (
                <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                  <span>{signupSuccess}</span>
                </div>
              )}

              <Field>
                <FieldLabel htmlFor="signup-name">Full Name</FieldLabel>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Aarav Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isSubmitting || isLoading}
                  required
                  autoComplete="name"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="signup-email">Email</FieldLabel>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="aarav@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting || isLoading}
                  required
                  autoComplete="email"
                />
              </Field>

                <Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="signup-password">Password</FieldLabel>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isSubmitting || isLoading}
                          required
                          autoComplete="new-password"
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

                    <Field>
                      <FieldLabel htmlFor="signup-confirm-password">
                        Confirm Password
                      </FieldLabel>
                      <Input
                        id="signup-confirm-password"
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isSubmitting || isLoading}
                        required
                        autoComplete="new-password"
                      />
                    </Field>
                  </div>
                  <FieldDescription className="text-xs">
                    Must be at least 6 characters long.
                  </FieldDescription>
                </Field>

              <Field>
                <Button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="w-full h-10 font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
                <FieldDescription className="text-center mt-2">
                  Already have an account?{" "}
                  {onSwitchToLogin ? (
                    <button
                      type="button"
                      onClick={onSwitchToLogin}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Sign in
                    </button>
                  ) : (
                    <a
                      href="#/login"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Sign in
                    </a>
                  )}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center text-xs">
        By clicking continue, you agree to our <a href="#/terms" className="underline hover:text-foreground">Terms of Service</a>{" "}
        and <a href="#/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
