import React from "react"

import ReactDOM from "react-dom/client"

import App from "./App"

import { EnvErrorBoundary } from "@/components/shared/EnvErrorBoundary"

import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <EnvErrorBoundary>
      <App />
    </EnvErrorBoundary>
  </React.StrictMode>,
)
