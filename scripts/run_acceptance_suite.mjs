import { build } from "vite"
import { spawn } from "node:child_process"
import path from "node:path"

console.log("Compiling acceptance tests with Vite...")
await build({
  configFile: path.resolve(process.cwd(), "vite.config.ts"),
  build: {
    ssr: path.resolve(process.cwd(), "scripts/verify_acceptance_tests.ts"),
    outDir: "dist_test",
    emptyOutDir: true,
    copyPublicDir: false,
  },
})

console.log("\nRunning compiled acceptance tests under Node.js...")
const child = spawn("node", ["dist_test/verify_acceptance_tests.js"], {
  stdio: "inherit",
  shell: true,
})

child.on("exit", (code) => {
  process.exit(code || 0)
})
