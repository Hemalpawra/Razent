import { useTheme } from "@/state/useTheme"
import { initThemeListener } from "@/state/useTheme"
import { useEffect } from "react"

/** Wrap once at the app root — activates .dark toggle and listens to system. */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initThemeListener()
  }, [])
  return <>{children}</>
}
