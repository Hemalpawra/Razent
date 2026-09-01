import type { ReactNode } from "react"
import {
  LayoutDashboard,
  Package,
  Upload,
  Bot,
  ShoppingCart,
  FileText,
  BarChart3,
  Settings,
  Store,
  Shield,
} from "lucide-react"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { useUI, type Screen } from "@/state/useUI"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

const navGroups: { label: string; items: { label: string; key: Screen; icon: typeof LayoutDashboard }[] }[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", key: "dashboard", icon: LayoutDashboard },
      { label: "Products", key: "products", icon: Package },
      { label: "Product Import", key: "import_placeholder", icon: Upload },
    ],
  },
  {
    label: "AI & Sales",
    items: [
      { label: "AI Agent", key: "ai_agent", icon: Bot },
      { label: "Orders", key: "orders", icon: ShoppingCart },
      { label: "Audit Trail", key: "audit_placeholder", icon: FileText },
      { label: "Analytics", key: "analytics", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [{ label: "Settings", key: "settings_placeholder", icon: Settings }],
  },
]

export function AppShell({ children }: { children: ReactNode }) {
  const activeScreen = useUI((s) => s.activeScreen)
  const setScreen = useUI((s) => s.setActiveScreen)
  const role = useUI((s) => s.role)
  const setRole = useUI((s) => s.setRole)

  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="offcanvas" className="border-sidebar-border">
        <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
          <div className="flex items-center gap-2 px-1">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Shield className="size-4" />
            </div>
            <div className="leading-none">
              <div className="text-sm font-semibold text-sidebar-foreground">Razent</div>
              <div className="text-[11px] text-muted-foreground">Merchant AI Gateway</div>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-0">
          {navGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-[11px] uppercase tracking-wider">{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map(({ label, key, icon: Icon }) => (
                    <SidebarMenuItem key={key}>
                      <SidebarMenuButton
                        isActive={activeScreen === key}
                        onClick={() => setScreen(key)}
                        tooltip={label}
                      >
                        <Icon />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent px-3 py-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              MS
            </div>
            <div className="min-w-0 flex-1 leading-none">
              <div className="truncate text-xs font-semibold text-sidebar-foreground">Merchant Store</div>
              <div className="truncate text-[11px] text-muted-foreground">Super Admin</div>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {/* Top bar — Merchant / Store switch + actions */}
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />

          {/* Merchant / Store toggle — replaces previous nav */}
          <div className="inline-flex rounded-lg border bg-muted p-1">
            <button
              type="button"
              onClick={() => setRole("merchant")}
              className={
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
                (role === "merchant" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")
              }
            >
              <Store className="size-3.5" />
              Merchant
            </button>
            <button
              type="button"
              onClick={() => setRole("store")}
              className={
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
                (role === "store" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")
              }
            >
              <ShoppingCart className="size-3.5" />
              Store
            </button>
          </div>

          {role === "store" && (
            <span className="hidden text-xs text-muted-foreground lg:inline">
              Customer view — Store home · Product · Cart · Checkout
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          {role === "store" ? (
            <div className="mx-auto w-full max-w-6xl">
              <div className="rounded-xl border border-dashed bg-card p-12 text-center">
                <Store className="mx-auto size-8 text-muted-foreground" />
                <h3 className="mt-3 font-heading text-lg font-medium text-foreground">Store preview</h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Customer storefront (Store home, Product detail, Cart, Delivery, Razorpay Checkout, Invoice + Tracking) will live here. Switch back to <span className="font-medium text-foreground">Merchant</span> to manage the dashboard.
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          )}
        </div>

        <footer className="border-t bg-background/40 py-4 text-center text-xs text-muted-foreground">
          <div className="flex flex-col items-center justify-between gap-2 px-4 md:flex-row">
            <p>© 2026 Merchant AI Gateway — shadcn base-mira · Figma 1920WLight.</p>
            <p className="font-mono text-[11px]">C:\Users\hemal\Ragent</p>
          </div>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  )
}
