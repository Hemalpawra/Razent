import { create } from "zustand"

export type ThemeMode = "light" | "dark" | "system"

type ThemeStore = {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  /** Internal — applies the resolved theme to <html>. */
  resolved: "light" | "dark"
  setResolved: (resolved: "light" | "dark") => void
}

const STORAGE_KEY = "razent.theme"

function readPersistedMode(): ThemeMode {
  if (typeof window === "undefined") return "system"
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw === "light" || raw === "dark" || raw === "system") return raw
  return "system"
}

function writePersistedMode(mode: ThemeMode) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, mode)
}

export const useTheme = create<ThemeStore>((set) => ({
  mode: readPersistedMode(),
  resolved: "light",
  setMode: (mode) => {
    writePersistedMode(mode)
    set({ mode })
  },
  setResolved: (resolved) => set({ resolved }),
}))

/**
 * Apply the persisted theme + listen to system changes.
 * Call once from <ThemeProvider>.
 */
export function initThemeListener() {
  if (typeof window === "undefined") return
  const mql = window.matchMedia("(prefers-color-scheme: dark)")
  const apply = () => {
    const { mode } = useTheme.getState()
    const resolved =
      mode === "system" ? (mql.matches ? "dark" : "light") : mode
    document.documentElement.classList.toggle("dark", resolved === "dark")
    useTheme.getState().setResolved(resolved)
  }
  mql.addEventListener("change", apply)
  apply()
  return () => mql.removeEventListener("change", apply)
}