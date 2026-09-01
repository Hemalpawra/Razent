import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { AppShell } from "@/components/shared/AppShell"
import ThemeProvider from "@/app/ThemeProvider"
import { useUI } from "@/state/useUI"

import DashboardScreen from "@/components/merchant/Dashboard"
import ProductsScreen from "@/components/merchant/Products"
import OrdersScreen from "@/components/merchant/Orders"
import AnalyticsScreen from "@/components/merchant/Analytics"
import AIAgentScreen from "@/components/merchant/AIAgent"
import AuditTrailScreen from "@/components/merchant/AuditTrail"

import { EmptyState } from "@/components/shared/EmptyState"
import { SparklesIcon } from "lucide-react"

export default function App() {
  const activeScreen = useUI((s) => s.activeScreen)

  const screenMap: Record<typeof activeScreen, React.ReactNode> = {
    dashboard: <DashboardScreen />,
    products: <ProductsScreen />,
    orders: <OrdersScreen />,
    analytics: <AnalyticsScreen />,
    ai_agent: <AIAgentScreen />,
    audit_trail: <AuditTrailScreen />,
    ai_agent_placeholder: (
      <EmptyState
        title="AI Agent"
        description="Active conversations, conversation details, business insights, and links to Orders / Invoice / Tracking / Audit Trail will live here per AI_RULES.md §1."
        icon={<SparklesIcon />}
      />
    ),
    import_placeholder: (
      <EmptyState title="Product Import" description="Batch / CSV / URL import coming next per AI_RULES.md §1." />
    ),
    audit_placeholder: (
      <EmptyState title="Audit Trail" description="Agent action + order event timeline — coming next." />
    ),
    settings_placeholder: (
      <EmptyState title="Settings" description="Store profile, Razorpay keys, AI tone, shipping policy — coming next." />
    ),
  }

  return (
    <ThemeProvider>
      <AppShell>
        {screenMap[activeScreen] ?? (
          <EmptyState title="Unknown screen" description="Select a screen from the nav." />
        )}
      </AppShell>
    </ThemeProvider>
  )
}