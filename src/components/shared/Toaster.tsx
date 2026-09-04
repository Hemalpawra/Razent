import { useEffect } from "react"
import { Toaster as SonnerToaster, toast } from "sonner"
import { useError } from "@/state/useError"

/**
 * Toaster — shadcn-style wrapper around sonner.
 *
 * Mount once at the top of the app (App.tsx). Reads the useError
 * store and shows a dismissable toast for each entry. Auto-dismisses
 * warnings (5s) and info (3s); errors persist until the user closes
 * them.
 *
 * The toast UI uses the app's theme via CSS vars (foreground,
 * background, etc.) — no hard-coded colours.
 */
export function Toaster() {
  const errors = useError((s) => s.errors)
  const dismiss = useError((s) => s.dismiss)
  const clear = useError((s) => s.clear)

  // Drain the store into sonner toasts whenever it changes.
  useEffect(() => {
    if (errors.length === 0) return

    errors.forEach((e) => {
      const opts = {
        id: e.id,
        description: e.description,
        duration:
          e.severity === "info"
            ? 3000
            : e.severity === "warning"
              ? 5000
              : Infinity,
        onDismiss: () => dismiss(e.id),
      }
      if (e.severity === "error") toast.error(e.title, opts)
      else if (e.severity === "warning") toast.warning(e.title, opts)
      else toast.info(e.title, opts)
    })

    clear()
  }, [errors, dismiss, clear])

  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      expand
      toastOptions={{
        classNames: {
          toast:
            "bg-card text-foreground border border-border shadow-lg rounded-xl",
          title: "font-semibold",
          description: "text-muted-foreground text-xs",
        },
      }}
    />
  )
}
