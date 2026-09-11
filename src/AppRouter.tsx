import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom"
import ThemeProvider from "@/app/ThemeProvider"
import { Toaster } from "@/components/shared/Toaster"
import { EnvErrorBoundary } from "@/components/shared/EnvErrorBoundary"
import { initMerchantAuth, useMerchant } from "@/state/useMerchant"
import { initCustomerAuth } from "@/state/useCustomerAuth"
import { isMerchantSubdomain, getMerchantUrl } from "@/lib/utils/subdomain"

import { AppShell } from "@/components/shared/AppShell"
import StoreHome from "@/components/customer/StoreHome"
import { AIAssistantPage } from "@/components/customer/AIAssistant"
import SignInScreen from "@/components/auth/SignInScreen"
import CustomerAuthPage from "@/components/customer/auth/CustomerAuthPage"

import DashboardScreen from "@/components/merchant/Dashboard"
import ProductsScreen from "@/components/merchant/Products"
import OrdersScreen from "@/components/merchant/Orders"
import AnalyticsScreen from "@/components/merchant/Analytics"
import AIAgentScreen from "@/components/merchant/AIAgent"
import AuditTrailScreen from "@/components/merchant/AuditTrail"
import SettingsScreen from "@/components/merchant/Settings"

function AdminLayout() {
  const { role, isLoading } = useMerchant()
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading admin...</p>
      </div>
    )
  }
  return (
    <AppShell readOnly={role === "view_only"}>
      <Outlet />
    </AppShell>
  )
}

function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to)
  }, [to])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Redirecting to merchant portal...</p>
    </div>
  )
}

function MerchantRoutes() {
  return (
    <Routes>
      <Route path="/signin" element={<SignInScreen />} />
      <Route path="/sign-in" element={<Navigate to="/signin" replace />} />

      {/* Top-level merchant console routes */}
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardScreen />} />
        <Route path="/products" element={<ProductsScreen />} />
        <Route path="/orders" element={<OrdersScreen />} />
        <Route path="/analytics" element={<AnalyticsScreen />} />
        <Route path="/ai_agent" element={<AIAgentScreen />} />
        <Route path="/audit_trail" element={<AuditTrailScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />

        {/* Backward-compatibility aliases for /merchant/* */}
        <Route path="/merchant" element={<Navigate to="/dashboard" replace />} />
        <Route path="/merchant/dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/merchant/products" element={<Navigate to="/products" replace />} />
        <Route path="/merchant/orders" element={<Navigate to="/orders" replace />} />
        <Route path="/merchant/analytics" element={<Navigate to="/analytics" replace />} />
        <Route path="/merchant/ai_agent" element={<Navigate to="/ai_agent" replace />} />
        <Route path="/merchant/audit_trail" element={<Navigate to="/audit_trail" replace />} />
        <Route path="/merchant/settings" element={<Navigate to="/settings" replace />} />
      </Route>

      {/* Legacy /admin/* redirects */}
      <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
      <Route path="/admin/*" element={<Navigate to="/dashboard" replace />} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function StorefrontRoutes() {
  return (
    <Routes>
      <Route path="/" element={<StoreHome />} />
      <Route path="/assistant" element={<AIAssistantPage />} />

      {/* Customer Authentication with clean path routing */}
      <Route path="/login/*" element={<CustomerAuthPage initialMode="login" />} />
      <Route path="/signup/*" element={<CustomerAuthPage initialMode="signup" />} />
      <Route path="/customer/login/*" element={<Navigate to="/login" replace />} />
      <Route path="/customer/signup/*" element={<Navigate to="/signup" replace />} />
      <Route path="/customer/auth/*" element={<CustomerAuthPage />} />

      {/* Direct Merchant Console Routes */}
      <Route path="/signin" element={<SignInScreen />} />
      <Route path="/sign-in" element={<Navigate to="/signin" replace />} />
      <Route path="/merchant" element={<AdminLayout />}>
        <Route index element={<Navigate to="/merchant/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardScreen />} />
        <Route path="products" element={<ProductsScreen />} />
        <Route path="orders" element={<OrdersScreen />} />
        <Route path="analytics" element={<AnalyticsScreen />} />
        <Route path="ai_agent" element={<AIAgentScreen />} />
        <Route path="audit_trail" element={<AuditTrailScreen />} />
        <Route path="settings" element={<SettingsScreen />} />
      </Route>
      <Route path="/admin" element={<Navigate to="/merchant/dashboard" replace />} />
      <Route path="/admin/*" element={<Navigate to="/merchant/dashboard" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function RouterApp() {
  const isMerchant = isMerchantSubdomain()

  useEffect(() => {
    initMerchantAuth()
    if (!isMerchant) {
      initCustomerAuth()
    }
  }, [isMerchant])

  return (
    <ThemeProvider>
      <Toaster />
      <EnvErrorBoundary>
        {isMerchant ? <MerchantRoutes /> : <StorefrontRoutes />}
      </EnvErrorBoundary>
    </ThemeProvider>
  )
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <RouterApp />
    </BrowserRouter>
  )
}
