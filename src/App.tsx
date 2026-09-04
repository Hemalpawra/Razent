import ThemeProvider from "@/app/ThemeProvider"
import AppRouter from "./AppRouter"

export default function App() {
  return (
    <ThemeProvider>
      <AppRouter />
    </ThemeProvider>
  )
}
