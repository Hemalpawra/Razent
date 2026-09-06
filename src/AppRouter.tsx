import { useEffect } from "react"
import { HashRouter, Routes, Route, Navigate, Outlet } from "react-router-dom"
import ThemeProvider from "@/app/ThemeProvider"
import { Toaster } from "@/components/shared/Toaster"
import { EnvErrorBoundary } from "@/components/shared/EnvErrorBoundary"
import { initMerchantAuth, useMerchant } from "@/state/useMerchant"

import { AppShell } from "@/components/shared/AppShell"
import StoreHome from "@/components/customer/StoreHome"
import AIAssistantScreen from "@/components/customer/AIAssistant/AIAssistantScreen"
import SignInScreen from "@/components/auth/SignInScreen"

import DashboardScreen from "@/components/merchant/Dashboard"
import ProductsScreen from "@/components/merchant/Products"
import OrdersScreen from "@/components/merchant/Orders"
import AnalyticsScreen from "@/components/merchant/Analytics"
import AIAgentScreen from "@/components/merchant/AIAgent"
import AuditTrailScreen from "@/components/merchant/AuditTrail"
import SettingsScreen from "@/components/merchant/Settings"

function AdminLayout() {
  const { role, isLoading } = useMerchant()
  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-background"><p className="text-sm text-muted-foreground">Loading admin...</p></div>
  return <AppShell readOnly={role === "view_only"}><Outlet /></AppShell>
}

function RouterApp() {
  useEffect(() => { initMerchantAuth() }, [])

  return (
    <ThemeProvider>
      <Toaster />
      <EnvErrorBoundary>
        <Routes>
          <Route path="/" element={<StoreHome />} />
          <Route path="/assistant" element={<AIAssistantScreen />} />
          
          {/* Canonical sign-in and legacy alias */}
          <Route path="/signin" element={<SignInScreen />} />
          <Route path="/sign-in" element={<Navigate to="/signin" replace />} />

          {/* Canonical Merchant Console (/#/merchant/*) */}
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

          {/* Legacy /admin/* redirects to /merchant/* */}
          <Route path="/admin" element={<Navigate to="/merchant/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<Navigate to="/merchant/dashboard" replace />} />
          <Route path="/admin/products" element={<Navigate to="/merchant/products" replace />} />
          <Route path="/admin/orders" element={<Navigate to="/merchant/orders" replace />} />
          <Route path="/admin/analytics" element={<Navigate to="/merchant/analytics" replace />} />
          <Route path="/admin/ai_agent" element={<Navigate to="/merchant/ai_agent" replace />} />
          <Route path="/admin/audit_trail" element={<Navigate to="/merchant/audit_trail" replace />} />
          <Route path="/admin/settings" element={<Navigate to="/merchant/settings" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </EnvErrorBoundary>
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
