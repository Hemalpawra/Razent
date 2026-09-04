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
import StoreHome from "@/components/customer/StoreHome"
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

const navGroups: {
  label: string
  items: { label: string; key: Screen; icon: typeof LayoutDashboard }[]
}[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", key: "dashboard", icon: LayoutDashboard },
      { label: "Products", key: "products", icon: Package },
      { label: "Product Import", key: "product_import", icon: Upload },
    ],
  },
  {
    label: "AI & Sales",
    items: [
      { label: "AI Agent", key: "ai_agent", icon: Bot },
      { label: "Orders", key: "orders", icon: ShoppingCart },
      { label: "Audit Trail", key: "audit_trail", icon: FileText },
      { label: "Analytics", key: "analytics", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [{ label: "Settings", key: "settings", icon: Settings }],
  },
]

export function AppShell({ children, readOnly }: { children: ReactNode; readOnly?: boolean }) {
  const activeScreen = useUI((s) => s.activeScreen)
  const setScreen = useUI((s) => s.setActiveScreen)
  const role = useUI((s) => s.role)
  const setRole = useUI((s) => s.setRole)
  const closeOrderDrawer = useUI((s) => s.closeOrderDrawer)
  const closeProductDrawer = useUI((s) => s.closeProductDrawer)
  const drawerOrderId = useUI((s) => s.drawerOrderId)
  const drawerProductId = useUI((s) => s.drawerProductId)

  const handleScreenChange = (key: Screen) => {
    if (drawerOrderId) closeOrderDrawer()
    if (drawerProductId) closeProductDrawer()
    setScreen(key)
  }

  // Store view — full width, no merchant sidebar chrome
  if (role === "store") {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center gap-2 border-b bg-card px-4 py-2">
          <div className="inline-flex rounded-lg border bg-muted p-1">
            <button
              type="button"
              onClick={() => setRole("merchant")}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Store className="size-3.5" />
              Merchant
            </button>
            <button
              type="button"
              onClick={() => setRole("store")}
              className="inline-flex items-center gap-1.5 rounded-md bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm"
            >
              <ShoppingCart className="size-3.5" />
              Store
            </button>
          </div>
          <span className="hidden text-xs text-muted-foreground lg:inline">
            Customer storefront — full width
          </span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
        <StoreHome />
      </div>
    )
  }

  return (
    <SidebarProvider style={{ ["--sidebar-width" as string]: "14.5rem" }}>
      <Sidebar
        variant="sidebar"
        collapsible="offcanvas"
        className="border-sidebar-border"
      >
        <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
          <div className="flex items-center gap-2 px-1">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Shield className="size-4" />
            </div>
            <div className="leading-none">
              <div className="text-sm font-semibold text-sidebar-foreground">
                Razent
              </div>
              <div className="text-[11px] text-muted-foreground">
                Merchant AI Gateway
              </div>
            </div>
          </div>
          {/* Merchant / Store switch — now in sidebar, slim fixed */}
          <div className="mt-3 inline-flex w-full rounded-lg border bg-muted p-1">
            <button
              type="button"
              onClick={() => {
                if (drawerOrderId) closeOrderDrawer()
                if (drawerProductId) closeProductDrawer()
                setRole("merchant")
              }}
              className={
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors " +
                (role === "merchant"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              <Store className="size-3.5" />
              Merchant
            </button>
            <button
              type="button"
              onClick={() => {
                if (drawerOrderId) closeOrderDrawer()
                if (drawerProductId) closeProductDrawer()
                setRole("store")
              }}
              className={
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors " +
                ((role as string) === "store"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              <ShoppingCart className="size-3.5" />
              Store
            </button>
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-0">
          {navGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-[11px] uppercase tracking-wider">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map(({ label, key, icon: Icon }) => (
                    <SidebarMenuItem key={key}>
                      <SidebarMenuButton
                        isActive={activeScreen === key}
                        onClick={() => handleScreenChange(key)}
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
              <div className="truncate text-xs font-semibold text-sidebar-foreground">
                Merchant Store
                {readOnly && (
                  <span className="ml-1.5 inline-flex rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                    VIEW ONLY
                  </span>
                )}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                {readOnly ? "Public — read-only mode" : "Super Admin"}
              </div>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {/* Top bar — simple per-page: trigger + theme only. No floating role switch */}
        <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <span className="text-sm font-medium text-foreground capitalize">
            {String(activeScreen).replace(/_/g, " ")}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 flex-col p-3 md:p-4">
          <div className="mx-auto w-full max-w-[1360px]">{children}</div>
        </div>

        <footer className="border-t bg-background/40 py-3 text-center text-xs text-muted-foreground">
          <div className="mx-auto flex max-w-[1360px] flex-col items-center justify-between gap-2 px-4 md:flex-row">
            <p>
              © 2026 Merchant AI Gateway — shadcn base-mira · Figma 1920WLight.
            </p>
            <p className="font-mono text-[11px]">C:\Users\hemal\Ragent</p>
          </div>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  )
}
