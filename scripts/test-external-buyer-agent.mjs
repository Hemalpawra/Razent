/**
 * Autonomous External AI Buyer Agent Simulator
 *
 * Demonstrates an autonomous AI agent connecting to Razent over UCP / ACP / AP2:
 * 1. Discovers Razent through UCP manifest
 * 2. Searches catalog for groceries matching a natural language prompt
 * 3. Formulates ACP checkout session
 * 4. Verifies spending cap (Human-Not-Present)
 * 5. Settles payment autonomously via Razorpay Test Rails
 */

import { spawn } from "node:child_process"

async function runAutonomousBuyerAgent() {
  console.log("==========================================================================")
  console.log("🤖 STARTING AUTONOMOUS BUYER AGENT (Human-Not-Present Shopping Simulation)")
  console.log("Task: Restock organic cooking oil within ₹500 user delegated spending cap")
  console.log("==========================================================================\n")

  const mcp = spawn("node", ["scripts/mcp-server.mjs"], {
    stdio: ["pipe", "pipe", "inherit"],
  })

  let reqId = 1
  const pendingRequests = new Map()

  mcp.stdout.on("data", (chunk) => {
    const lines = chunk.toString().split("\n")
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const json = JSON.parse(line)
        if (json.id && pendingRequests.has(json.id)) {
          const resolver = pendingRequests.get(json.id)
          pendingRequests.delete(json.id)
          resolver(json)
        }
      } catch {}
    }
  })

  function callTool(name, args) {
    return new Promise((resolve) => {
      const id = reqId++
      pendingRequests.set(id, (resp) => {
        if (resp.error) throw new Error(resp.error.message)
        const text = resp.result?.content?.[0]?.text
        resolve(text ? JSON.parse(text) : resp.result)
      })
      const payload = {
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params: { name, arguments: args },
      }
      mcp.stdin.write(JSON.stringify(payload) + "\n")
    })
  }

  try {
    // Step 1: Agent searches UCP Catalog
    console.log("🔍 [Step 1] Buyer Agent queries UCP Catalog for 'Apple'...")
    const searchResult = await callTool("ucp_catalog_search", { query: "Apple" })
    console.log(`✓ Found ${searchResult.matches_count} matching products.`)
    const chosenProduct = searchResult.products[0]
    if (!chosenProduct) {
      throw new Error("No products found matching prompt")
    }
    console.log(`  Selected item: "${chosenProduct.title}" — ₹${chosenProduct.price_rupees} (ID: ${chosenProduct.id})`)

    // Step 2: Agent negotiates ACP Checkout Session
    console.log("\n📦 [Step 2] Buyer Agent creates ACP Checkout Session...")
    const checkoutSession = await callTool("acp_create_checkout_session", {
      items: [{ id: chosenProduct.id, quantity: 1 }],
      delivery_address: {
        full_name: "Dr. Arvind (Autonomous Agent Household)",
        phone: "+91 98765 43210",
        line1: "42 HAL 2nd Stage, Indiranagar",
        city: "Bengaluru",
        pincode: "560038",
      },
    })
    console.log(`✓ Checkout Session created: ${checkoutSession.id}`)
    console.log(`  Total amount: ₹${checkoutSession.total_rupees}`)
    console.log(`  Supported handlers: ${checkoutSession.supported_handlers.join(", ")}`)

    // Step 3: Agent checks user delegated limits (AP2 Intent Mandate)
    const delegatedLimitRupees = 500
    console.log(`\n🛡️ [Step 3] Checking AP2 Intent Mandate Spending Cap (Cap: ₹${delegatedLimitRupees}.00)...`)
    const totalPaise = checkoutSession.total_paise
    if (totalPaise > delegatedLimitRupees * 100) {
      console.log("⚠️ Total exceeds delegated limit! Step-up challenge required.")
      return
    }
    console.log("✓ Total is within user delegated limit. Autonomous 0-click settlement approved!")

    // Step 4: Execute Settlement via Razorpay Test Rails
    console.log("\n⚡ [Step 4] Executing AP2 Autonomous Settlement via Razorpay Rails...")
    const settlementResult = await callTool("ap2_execute_autonomous_checkout", {
      checkout_session_id: checkoutSession.id,
      upi_vpa: "arvind@okhdfcbank",
      delegated_price_cap_paise: delegatedLimitRupees * 100,
    })

    console.log("==========================================================================")
    console.log("🎉 AUTONOMOUS AGENT PURCHASE COMPLETED SUCCESSFULLY!")
    console.log(`  - Order ID:           ${settlementResult.order_id}`)
    console.log(`  - Razorpay Order ID:  ${settlementResult.razorpay_order_id}`)
    console.log(`  - Settled Amount:     ₹${settlementResult.amount_paid_rupees}`)
    console.log(`  - Settlement Rail:    ${settlementResult.settlement_rail}`)
    console.log(`  - Guaranteed Delivery: ${settlementResult.delivery_eta}`)
    console.log("==========================================================================")
  } finally {
    mcp.kill()
  }
}

runAutonomousBuyerAgent().catch(console.error)
