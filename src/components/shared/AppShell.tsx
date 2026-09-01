import type { ReactNode } from "react"

import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { useUI } from "@/state/useUI"

export function AppShell({ children }: { children: ReactNode }) {
  const activeScreen = useUI((s) => s.activeScreen)
  const setScreen = useUI((s) => s.setActiveScreen)

  const nav = [
    { label: "Dashboard", key: "dashboard" as const },
    { label: "Products", key: "products" as const },
    { label: "Orders", key: "orders" as const },
    { label: "Analytics", key: "analytics" as const },
  ]

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <a href="#" onClick={() => setScreen("dashboard")}>
            <span className="font-heading text-sm font-medium">Merchant AI</span>
          </a>
          <nav className="ml-4 flex gap-1 overflow-x-auto">
            {nav.map(({ label, key }) => (
              <a
                key={key}
                href="#"
                onClick={() => setScreen(key)}
                className={
                  "rounded-md px-3 py-1.5 text-xs transition-colors whitespace-nowrap " +
                  (key === activeScreen
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground")
                }
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {children}
      </main>
      <footer className="border-t border-border/60 bg-background/40 py-6 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between">
            <p>© 2026 Merchant AI Gateway — built with shadcn base-mira + Figma Make.</p>
            <p>Working locally: <code className="text-xs">C:\Users\hemal\Ragent</code></p>
          </div>
        </div>
      </footer>
    </div>
  )
}