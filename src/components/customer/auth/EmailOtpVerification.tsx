import { useState, useEffect, useRef } from "react"
import { Mail, ArrowLeft, RotateCw, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useCustomerAuth } from "@/state/useCustomerAuth"
import { cn } from "@/lib/utils"

interface EmailOtpVerificationProps {
  email: string
  onSuccess?: () => void
  onBackToEmail: () => void
  className?: string
}

export function EmailOtpVerification({
  email,
  onSuccess,
  onBackToEmail,
  className,
}: EmailOtpVerificationProps) {
  const { verifyEmailOtp, sendEmailOtp, isLoading } = useCustomerAuth()
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""])
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [timer, setTimer] = useState(60)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Auto focus first input on mount
  useEffect(() => {
    setTimeout(() => {
      inputRefs.current[0]?.focus()
    }, 150)
  }, [])

  // Timer countdown
  useEffect(() => {
    if (timer <= 0) return
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [timer])

  // Handle single digit input
  const handleDigitChange = (index: number, val: string) => {
    // Only accept numeric
    const clean = val.replace(/\D/g, "")
    if (!clean) {
      const next = [...digits]
      next[index] = ""
      setDigits(next)
      return
    }

    // Single character
    const char = clean.slice(-1)
    const next = [...digits]
    next[index] = char
    setDigits(next)
    setErrorMsg(null)

    // Focus next box
    if (index < 5) {
      inputRefs.current[index + 1]?.focus()
    } else {
      // If all 6 digits are filled, auto verify
      const fullCode = next.join("")
      if (fullCode.length === 6) {
        verifyCode(fullCode)
      }
    }
  }

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return

    const next = [...digits]
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i]
    }
    setDigits(next)
    setErrorMsg(null)

    const nextFocus = Math.min(pasted.length, 5)
    inputRefs.current[nextFocus]?.focus()

    if (pasted.length === 6) {
      verifyCode(pasted)
    }
  }

  const verifyCode = async (tokenString?: string) => {
    const code = tokenString || digits.join("")
    if (code.length < 6) {
      setErrorMsg("Please enter all 6 digits of the verification code.")
      return
    }

    setIsVerifying(true)
    setErrorMsg(null)

    try {
      const { user, error } = await verifyEmailOtp({
        email,
        token: code,
      })

      if (error) {
        setErrorMsg(error.message || "Invalid or expired verification code.")
        toast.error("Verification failed", {
          description: error.message || "Please check the code and try again.",
        })
      } else if (user) {
        toast.success("Email verified!", {
          description: `Welcome! Successfully signed in as ${user.email}.`,
        })
        onSuccess?.()
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to verify code.")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    if (timer > 0 || isResending) return
    setIsResending(true)
    setErrorMsg(null)
    setDigits(["", "", "", "", "", ""])

    try {
      const { error } = await sendEmailOtp(email)
      if (error) {
        setErrorMsg(error.message || "Failed to resend code.")
        toast.error("Resend error", { description: error.message })
      } else {
        setTimer(60)
        toast.success("Code resent!", {
          description: `A fresh 6-digit code was sent to ${email}.`,
        })
        inputRefs.current[0]?.focus()
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to resend verification code.")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <Card className="border-border/60 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2 shadow-xs">
            <Mail className="size-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Verify Your Email</CardTitle>
          <CardDescription className="text-xs">
            We sent a 6-digit one-time passcode to{" "}
            <span className="font-semibold text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 6 Digit OTP Inputs */}
          <div className="flex justify-center items-center gap-2 sm:gap-3 py-2" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                disabled={isVerifying || isLoading}
                className={cn(
                  "size-11 sm:size-12 rounded-xl text-center font-mono text-xl font-bold bg-muted/40 border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 outline-hidden transition-all",
                  digit ? "border-primary bg-primary/5 text-foreground shadow-xs" : "text-muted-foreground",
                  isVerifying && "opacity-50",
                )}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <button
              type="button"
              onClick={onBackToEmail}
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-medium"
            >
              <ArrowLeft className="size-3.5" />
              Change email
            </button>

            <div>
              {timer > 0 ? (
                <span>Resend code in {timer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="inline-flex items-center gap-1.5 text-primary font-semibold hover:underline"
                >
                  {isResending ? <RotateCw className="size-3 animate-spin" /> : <RotateCw className="size-3" />}
                  Resend OTP
                </button>
              )}
            </div>
          </div>

          <Button
            type="button"
            onClick={() => verifyCode()}
            disabled={isVerifying || digits.join("").length < 6 || isLoading}
            className="w-full h-10 font-semibold mt-2"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Verifying Code...
              </>
            ) : (
              "Verify & Sign In"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
