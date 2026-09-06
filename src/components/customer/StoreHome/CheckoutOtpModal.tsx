import { useState, useEffect, useRef } from "react"
import {
  ShieldCheck,
  Smartphone,
  RotateCw,
  X,
  CheckCircle2,
  AlertCircle,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface CheckoutOtpModalProps {
  open: boolean
  phone: string
  onClose: () => void
  onVerified: (phone: string) => void
}

export function CheckoutOtpModal({
  open,
  phone,
  onClose,
  onVerified,
}: CheckoutOtpModalProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""])
  const [expectedOtp, setExpectedOtp] = useState<string>("123456")
  const [timer, setTimer] = useState<number>(60)
  const [isVerifying, setIsVerifying] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState<boolean>(false)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Format clean phone
  const cleanPhone = phone.replace(/[^\d]/g, "").slice(-10) || "9876543210"
  const maskedPhone = `+91 ${cleanPhone.slice(0, 2)}*** ***${cleanPhone.slice(-2)}`

  // Send new OTP
  const sendNewOtp = (isInitial = false) => {
    // Generate 6-digit OTP (default to 123456 for predictable testing or random code)
    const newCode = "123456"
    setExpectedOtp(newCode)
    setDigits(["", "", "", "", "", ""])
    setErrorMsg(null)
    setTimer(60)

    toast.info(`Verification code sent to +91 ${cleanPhone}`, {
      description: `Use code ${newCode} to confirm your mobile number.`,
      duration: 8000,
    })

    // Focus first input
    setTimeout(() => {
      inputRefs.current[0]?.focus()
    }, 100)
  }

  // Timer countdown
  useEffect(() => {
    if (!open) return
    sendNewOtp(true)
    setIsSuccess(false)
  }, [open, phone])

  useEffect(() => {
    if (!open || timer <= 0) return
    const interval = setInterval(() => {
      setTimer((t) => t - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [open, timer])

  const handleDigitChange = (index: number, val: string) => {
    setErrorMsg(null)
    const cleaned = val.replace(/[^\d]/g, "")
    if (!cleaned) {
      const nextDigits = [...digits]
      nextDigits[index] = ""
      setDigits(nextDigits)
      return
    }

    // Single digit input
    const nextDigits = [...digits]
    nextDigits[index] = cleaned.slice(-1)
    setDigits(nextDigits)

    // Auto-advance
    if (index < 5 && cleaned) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto verify if all 6 digits entered
    if (index === 5 || nextDigits.every((d) => d.length > 0)) {
      const fullCode = nextDigits.join("")
      if (fullCode.length === 6) {
        verifyCode(fullCode)
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasteData = e.clipboardData.getData("text").replace(/[^\d]/g, "").slice(0, 6)
    if (!pasteData) return

    const nextDigits = ["", "", "", "", "", ""]
    for (let i = 0; i < pasteData.length; i++) {
      nextDigits[i] = pasteData[i]
    }
    setDigits(nextDigits)

    if (pasteData.length === 6) {
      inputRefs.current[5]?.focus()
      verifyCode(pasteData)
    } else {
      inputRefs.current[Math.min(pasteData.length, 5)]?.focus()
    }
  }

  const verifyCode = (codeToVerify?: string) => {
    const fullCode = codeToVerify || digits.join("")
    if (fullCode.length < 6) {
      setErrorMsg("Please enter the complete 6-digit code.")
      return
    }

    setIsVerifying(true)
    setErrorMsg(null)

    setTimeout(() => {
      if (fullCode === expectedOtp || fullCode === "123456") {
        setIsSuccess(true)
        toast.success("Mobile number verified successfully!")
        setTimeout(() => {
          setIsVerifying(false)
          onVerified(phone)
          onClose()
        }, 500)
      } else {
        setIsVerifying(false)
        setErrorMsg("Incorrect OTP code. Please check and try again.")
      }
    }, 400)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center ring-8 ring-primary/5">
            <Smartphone className="size-6" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Verify Phone Number
          </h2>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Enter the 6-digit verification code sent to{" "}
            <span className="font-semibold text-foreground font-mono">{maskedPhone}</span>{" "}
            to authorize your checkout.
          </p>
        </div>

        {/* 6 Digit Input Boxes */}
        <div className="space-y-4">
          <div className="flex justify-center gap-2 sm:gap-2.5">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                disabled={isVerifying || isSuccess}
                className={`size-11 sm:size-12 rounded-xl text-center font-mono text-lg font-bold border transition-all shadow-sm outline-none ${
                  errorMsg
                    ? "border-destructive ring-1 ring-destructive bg-destructive/5 text-destructive"
                    : isSuccess
                      ? "border-emerald-500 ring-1 ring-emerald-500 bg-emerald-500/10 text-emerald-600"
                      : digit
                        ? "border-primary ring-1 ring-primary bg-primary/5 text-foreground"
                        : "border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20"
                }`}
              />
            ))}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-destructive text-center">
              <AlertCircle className="size-3.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success State */}
          {isSuccess && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-medium text-center">
              <CheckCircle2 className="size-4" />
              <span>Mobile confirmed! Continuing to payment...</span>
            </div>
          )}
        </div>

        {/* Resend & Demo Hint */}
        <div className="space-y-3 text-center">
          <div className="text-xs text-muted-foreground">
            {timer > 0 ? (
              <span>Resend code in <b className="font-mono text-foreground">{timer}s</b></span>
            ) : (
              <button
                type="button"
                onClick={() => sendNewOtp()}
                className="text-primary font-semibold hover:underline inline-flex items-center gap-1"
              >
                <RotateCw className="size-3" /> Resend OTP Code
              </button>
            )}
          </div>

          <div className="rounded-lg bg-muted/60 border border-border/50 p-2.5 text-[11px] text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Lock className="size-3 text-primary" /> Test verification code:
            </span>
            <span className="font-mono font-bold text-foreground bg-card px-2 py-0.5 rounded border">
              123456
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isVerifying || isSuccess}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 gap-1.5"
            onClick={() => verifyCode()}
            disabled={digits.some((d) => !d) || isVerifying || isSuccess}
          >
            {isVerifying ? (
              <>Verifying...</>
            ) : isSuccess ? (
              <>
                <CheckCircle2 className="size-4" /> Verified
              </>
            ) : (
              <>
                <ShieldCheck className="size-4" /> Verify & Continue
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
