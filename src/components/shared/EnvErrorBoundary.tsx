import { Component, type ReactNode } from "react"
import { AlertTriangle, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useError } from "@/state/useError"

/**
 * Top-level error boundary. Catches errors thrown during render or in
 * initial component mounting. Shows a single, dismissable error card so the user knows
 * exactly what's wrong instead of seeing a blank screen.
 */
type Props = {
  children: ReactNode
}
type State = {
  error: Error | null
}

export class EnvErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    // Surface to the global error store as well, so sonner Toaster can
    // also show a toast if mounted inside the boundary.
    try {
      useError.getState().push({
        title: "App failed to start",
        description: error.message,
        severity: "error",
      })
    } catch {
      /* useError store not available yet — fall back to inline display */
    }
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      const isEnvError =
        this.state.error.message.includes("VITE_SUPABASE_") ||
        this.state.error.message.includes("Razent:")
      return (
        <div className="grid min-h-screen place-items-center bg-background p-6">
          <div className="max-w-md space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  {isEnvError ? "Configuration required" : "App failed to start"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isEnvError
                    ? "Razent needs Supabase credentials to run."
                    : "Something went wrong during boot."}
                </p>
              </div>
            </div>
            <pre className="overflow-auto rounded-lg bg-muted p-3 text-xs leading-relaxed text-foreground">
              {this.state.error.message}
            </pre>
            {isEnvError && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">To fix:</p>
                <ol className="mt-1 list-decimal pl-4 space-y-0.5">
                  <li>
                    Open{" "}
                    <code className="rounded bg-background px-1">
                      C:/Users/hemal/Ragent/Razent/.env
                    </code>
                  </li>
                  <li>
                    Ensure it has{" "}
                    <code className="rounded bg-background px-1">
                      VITE_SUPABASE_URL
                    </code>{" "}
                    and{" "}
                    <code className="rounded bg-background px-1">
                      VITE_SUPABASE_ANON_KEY
                    </code>
                  </li>
                  <li>Restart the dev server</li>
                </ol>
              </div>
            )}
            <Button onClick={this.reset} className="w-full">
              <RefreshCcw className="size-4" />
              Retry
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
