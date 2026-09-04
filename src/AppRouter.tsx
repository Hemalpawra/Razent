import { useEffect } from "react"
import { HashRouter, Routes, Route, Navigate } from "react-router-dom"
import ThemeProvider from "@/app/ThemeProvider"
import { Toaster } from "@/components/shared/Toaster"
import { EnvErrorBoundary } from "@/components/shared/EnvErrorBoundary"
import { initMerchantAuth, useMerchant } from "@/state/useMerchant"

import { AppShell } from "@/components/shared/AppShell"
import StoreHome from "@/components/customer/StoreHome"
import SignInScreen from "@/components/auth/SignInScreen"

import DashboardScreen from "@/components/merchant/Dashboard"
import ProductsScreen from "@/components/merchant/Products"
import OrdersScreen from "@/components/merchant/Orders"
import AnalyticsScreen from "@/components/merchant/Analytics"
import AIAgentScreen from "@/components/merchant/AIAgent"
import AuditTrailScreen from "@/components/merchant/AuditTrail"
import SettingsScreen from "@/components/merchant/Settings"

function RouterApp() {
  useEffect(() => { initMerchantAuth() }, [])
  const { user, profile, isLoading } = useMerchant()
  const isPrivate = !!user && !!profile

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <ThemeProvider>
      <Toaster />
      <EnvErrorBoundary />
      <Routes>
        {/* Public storefront — always view-only */}
        <Route path="/" element={<StoreHome />} />

        {/* Sign-in for private admin access */}
        <Route path="/sign-in" element={<SignInScreen />} />

        {/* Admin console — private (signed in) = full access; public (no auth) = read-only */}
        <Route path="/admin/*" element={<AppShell readOnly={!isPrivate} />}>
          <Route index element={<DashboardScreen />} />
          <Route path="dashboard" element={<DashboardScreen />} />
          <Route path="products" element={<ProductsScreen />} />
          <Route path="orders" element={<OrdersScreen />} />
          <Route path="analytics" element={<AnalyticsScreen />} />
          <Route path="ai_agent" element={<AIAgentScreen />} />
          <Route path="audit_trail" element={<AuditTrailScreen />} />
          <Route path="settings" element={<SettingsScreen />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  )
}

export default function AppRouter() {
  return (
    <HashRouter>
      <RouterApp />
    </HashRouter>
  )
}
