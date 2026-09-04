import { Navigate, Outlet } from "react-router-dom"
import { useMerchant } from "@/state/useMerchant"

export default function RequireAuth({ children }: { children?: React.ReactNode }) {
  const { user, profile, isLoading } = useMerchant()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Checking authentication...</p>
      </div>
    )
  }

  if (!user || !profile) {
    return <Navigate to="/sign-in" replace />
  }

  return children ? <>{children}</> : <Outlet />
}
