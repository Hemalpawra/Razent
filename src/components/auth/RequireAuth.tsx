import { Navigate, Outlet } from "react-router-dom"
import { useMerchant } from "@/state/useMerchant"
import { useUI } from "@/state/useUI"

export default function RequireAuth({ children, readOnly }: { children?: React.ReactNode; readOnly?: boolean }) {
  const { user, profile, isLoading } = useMerchant()
  const { setRole } = useUI()

  // When entering admin without auth → public read-only mode
  if (!isLoading && !user && !profile && !readOnly) {
    // First visit without auth: go to sign-in (user can sign in for private access)
    // If the user explicitly wants public mode, we don't redirect.
    return <Navigate to="/sign-in" replace />
  }

  // If public mode (readOnly=true) and no auth → set role to store for read-only view
  if (!isLoading && !user && !profile && readOnly) {
    setRole("store")
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Checking authentication...</p>
      </div>
    )
  }

  // Signed-in: user has full access; public (readOnly): user sees admin interface in view-only mode
  return children ? <>{children}</> : <Outlet />
}
