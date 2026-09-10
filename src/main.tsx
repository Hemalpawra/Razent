import { ClerkProvider } from "@clerk/react";
import React from "react"

import ReactDOM from "react-dom/client"

import App from "./App"

import { EnvErrorBoundary } from "@/components/shared/EnvErrorBoundary"

import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <EnvErrorBoundary>
      <ClerkProvider
        publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
        afterSignOutUrl="/"
      >
      <App />
    </ClerkProvider>
    </EnvErrorBoundary>
  </React.StrictMode>,
)
