import { useTheme } from "@/state/useTheme"
import { useEffect } from "react"

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useTheme((s) => s.mode)

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () => {
      const resolved = mode === "system" ? (mql.matches ? "dark" : "light") : mode
      document.documentElement.classList.toggle("dark", resolved === "dark")
    }
    apply()
    const handler = () => {
      if (mode === "system") apply()
    }
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [mode])

  // also sync on mount for persisted mode
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const resolved = mode === "system" ? (mql.matches ? "dark" : "light") : mode
    document.documentElement.classList.toggle("dark", resolved === "dark")
  }, [mode])

  return <>{children}</>
}
