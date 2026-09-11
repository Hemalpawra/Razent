import { ClerkProvider } from "@clerk/react";
import React from "react"

import ReactDOM from "react-dom/client"

import App from "./App"

import { EnvErrorBoundary } from "@/components/shared/EnvErrorBoundary"

import "./index.css"

const host = typeof window !== "undefined" ? window.location.hostname : ""
const isVercelHost = host === "razent.vercel.app" || host.endsWith(".vercel.app")
const clerkProxyUrl =
  import.meta.env.VITE_CLERK_PROXY_URL ||
  (isVercelHost ? `${window.location.origin}/__clerk` : undefined)

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <EnvErrorBoundary>
      <ClerkProvider
        publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
        proxyUrl={clerkProxyUrl}
        afterSignOutUrl="/"
      >
        <App />
      </ClerkProvider>
    </EnvErrorBoundary>
  </React.StrictMode>,
)
