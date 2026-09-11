import { SignIn, SignUp } from "@clerk/react"
import { ArrowLeft } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"

interface CustomerAuthPageProps {
  initialMode?: "login" | "signup"
}

export default function CustomerAuthPage({ initialMode }: CustomerAuthPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const mode = initialMode || (location.pathname.includes("signup") ? "signup" : "login")

  return (
    <main className="relative min-h-screen bg-muted/30 px-4 py-6 sm:px-8">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/")}
        className="gap-2 text-muted-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Store
      </Button>
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center justify-center">
        {mode === "signup" ? (
          <SignUp
            routing="path"
            path="/signup"
            signInUrl="/login"
            fallbackRedirectUrl="/"
            appearance={{ elements: { card: "shadow-lg" } }}
          />
        ) : (
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/signup"
            fallbackRedirectUrl="/"
            appearance={{ elements: { card: "shadow-lg" } }}
          />
        )}
      </div>
    </main>
  )
}
