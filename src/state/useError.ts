import { create } from "zustand"

/**
 * App-wide error store. Q7 (B): every Supabase/Razorpay/LLM call that
 * throws is caught by client.ts and pushed here; the mounted <Toaster />
 * (sonner) shows a dismissable toast.
 *
 * Severity drives the toast colour:
 *   - error  → red, persists until dismissed
 *   - warning → amber, auto-dismisses in 5s
 *   - info   → blue, auto-dismisses in 3s
 */
export type AppError = {
  id: string
  title: string
  description?: string
  severity: "error" | "warning" | "info"
  /** Optional retry action surfaced as a toast button. */
  retry?: () => void
  at: number
}

type ErrorStore = {
  errors: AppError[]
  push: (e: Omit<AppError, "id" | "at">) => string
  dismiss: (id: string) => void
  clear: () => void
}

export const useError = create<ErrorStore>((set) => ({
  errors: [],
  push: (e) => {
    const id = `err_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 6)}`
    set((s) => ({ errors: [...s.errors, { ...e, id, at: Date.now() }] }))
    return id
  },
  dismiss: (id) =>
    set((s) => ({ errors: s.errors.filter((e) => e.id !== id) })),
  clear: () => set({ errors: [] }),
}))

/**
 * Convenience: wrap any async function so any thrown error is captured
 * and pushed to useError instead of bubbling. Use for non-critical paths.
 *
 *   const safeDelete = withErrorHandling(deleteProduct, {
 *     title: "Couldn't delete product",
 *   })
 */
export async function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  meta: Pick<AppError, "title" | "severity"> & {
    description?: (err: unknown) => string
  },
): Promise<ReturnType<T> | undefined> {
  try {
    return await fn()
  } catch (err) {
    useError.getState().push({
      title: meta.title,
      description: meta.description ? meta.description(err) : String(err),
      severity: meta.severity ?? "error",
    })
    return undefined
  }
}
