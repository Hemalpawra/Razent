import { useEffect } from "react"
import { HashRouter, Routes, Route, Navigate, Outlet } from "react-router-dom"
import ThemeProvider from "@/app/ThemeProvider"
import { Toaster } from "@/components/shared/Toaster"
import { EnvErrorBoundary } from "@/components/shared/EnvErrorBoundary"
import { initMerchantAuth } from "@/state/useMerchant"

import { AppShell } from "@/components/shared/AppShell"
import StoreHome from "@/components/customer/StoreHome"
import SignInScreen from "@/components/auth/SignInScreen"
import RequireAuth from "@/components/auth/RequireAuth"

import DashboardScreen from "@/components/merchant/Dashboard"
import ProductsScreen from "@/components/merchant/Products"
import OrdersScreen from "@/components/merchant/Orders"
import AnalyticsScreen from "@/components/merchant/Analytics"
import AIAgentScreen from "@/components/merchant/AIAgent"
import AuditTrailScreen from "@/components/merchant/AuditTrail"
import SettingsScreen from "@/components/merchant/Settings"

function RouterApp() {
  useEffect(() => { initMerchantAuth() }, [])

  return (
    <ThemeProvider>
      <Toaster />
      <EnvErrorBoundary />
      <Routes>
        {/* Public storefront */}
        <Route path="/" element={<StoreHome />} />
        <Route path="/sign-in" element={<SignInScreen />} />

        {/* Protected admin: /admin/* */}
        <Route path="/admin/*" element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route index element={<DashboardScreen />} />
          <Route path="dashboard" element={<DashboardScreen />} />
          <Route path="products" element={<ProductsScreen />} />
          <Route path="orders" element={<OrdersScreen />} />
          <Route path="analytics" element={<AnalyticsScreen />} />
          <Route path="ai_agent" element={<AIAgentScreen />} />
          <Route path="audit_trail" element={<AuditTrailScreen />} />
          <Route path="settings" element={<SettingsScreen />} />
        </Route>

        {/* Fallback: redirect unknown paths to public storefront */}
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
