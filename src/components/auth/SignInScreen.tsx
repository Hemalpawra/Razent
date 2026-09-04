import { useState } from "react"
import { Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useMerchant } from "@/state/useMerchant"

export default function SignInScreen() {
  const { signIn, isLoading } = useMerchant()
  const [email, setEmail] = useState("merchant1@razent.local")
  const [sent, setSent] = useState(false)

  const handleSignIn = async () => {
    await signIn(email.trim())
    setSent(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md rounded-2xl bg-card shadow-lg">
        <CardContent className="p-8 space-y-6">
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Merchant Sign In</h1>
            <p className="text-sm text-muted-foreground">Access the admin console with a magic link.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <Mail className="size-4" />
            Enter your merchant email. Only <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">super_admin</Badge> and <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">merchant</Badge> accounts can sign in.
          </div>
          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground">Merchant Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="merchant1@razent.local"
              className="h-10 rounded-lg bg-card"
            />
          </div>
          <Button
            className="w-full h-10 rounded-lg"
            onClick={handleSignIn}
            disabled={isLoading || !email.trim()}
          >
            {isLoading ? "Sending..." : "Send Magic Link"}
          </Button>
          {sent && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              Magic link sent. Check your inbox to complete sign in.
            </p>
          )}
          <div className="border-t pt-4 text-[11px] text-muted-foreground space-y-1">
            <p>Seeded accounts:</p>
            <p>• demo@razent.local (super_admin)</p>
            <p>• merchant1@razent.local (merchant)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
