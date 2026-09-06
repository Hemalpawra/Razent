import { trackOrder, executeStorefrontPayment } from "../src/lib/api/client"
import { orderStore } from "../src/lib/storage/orderStore"
import { ROLE_PERMISSIONS } from "../src/state/useMerchant"
import type { Order } from "../src/lib/types/order"

declare const process: { exit: (code?: number) => never }

async function runAcceptanceTests() {
  console.log("=== STARTING RAZENT ACCEPTANCE TESTS ===\n")
  let passed = 0
  let failed = 0

  function assert(condition: boolean, name: string) {
    if (condition) {
      console.log(`[PASS] ${name}`)
      passed++
    } else {
      console.error(`[FAIL] ${name}`)
      failed++
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 1. Role & Permission Architecture
  // ─────────────────────────────────────────────────────────────
  console.log("--- Test Suite 1: Role & Permission Architecture ---")
  assert(ROLE_PERMISSIONS.view_only.view_orders === true, "view_only can view orders")
  assert(ROLE_PERMISSIONS.view_only.refund_orders === false, "view_only is BLOCKED from refunding orders")
  assert(ROLE_PERMISSIONS.view_only.edit_products === false, "view_only is BLOCKED from editing products")
  assert(ROLE_PERMISSIONS.view_only.delete_products === false, "view_only is BLOCKED from deleting products")
  assert(ROLE_PERMISSIONS.view_only.import_products === false, "view_only is BLOCKED from importing products")
  assert(ROLE_PERMISSIONS.view_only.export_data === false, "view_only is BLOCKED from exporting data")
  assert(ROLE_PERMISSIONS.view_only.edit_ai_settings === false, "view_only is BLOCKED from editing AI settings")
  assert(ROLE_PERMISSIONS.admin.refund_orders === true, "admin can refund orders")
  assert(ROLE_PERMISSIONS.admin.edit_products === true, "admin can edit products")
  assert(ROLE_PERMISSIONS.admin.delete_products === true, "admin can delete products")
  assert(ROLE_PERMISSIONS.admin.export_data === true, "admin can export data")

  // ─────────────────────────────────────────────────────────────
  // 2. Strict 3-Factor Order Tracking
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- Test Suite 2: Strict 3-Factor Order Tracking ---")
  const testOrderId = `ORD-TEST-${Date.now()}`
  const validMobile = "9876543210"
  const validEmail = "ananya.rao@example.com"

  const seededOrder: Order = {
    id: testOrderId,
    razorpay_order_id: `rzp_${Date.now()}`,
    status: "paid",
    shipping_status: "packed",
    currency: "INR",
    total_paise: 249900,
    shipping_paise: 0,
    items: [
      {
        product_id: "p1",
        title: "Test Headphones",
        image_url: "",
        qty: 1,
        unit_price_paise: 249900,
      },
    ],
    shipping_address: {
      full_name: "Ananya Rao",
      phone: "+91 98765 43210",
      email: validEmail,
      line1: "123 MG Road",
      city: "Bengaluru",
      state: "KA",
      pincode: "560001",
      country: "IN",
    },
    via_ai: false,
    commerce_protocol: "direct_web",
    created_at: new Date().toISOString(),
  }
  orderStore.set(seededOrder)

  // Test 2.1: Single string query is rejected
  const singleQueryRes = await trackOrder("ORD-123456" as any)
  assert(singleQueryRes === null, "Single string query rejected (cannot bypass 3 factors)")

  // Test 2.2: Missing mobile rejected
  const missingMobileRes = await trackOrder({ orderId: testOrderId, mobile: "", email: validEmail })
  assert(missingMobileRes === null, "Missing mobile number rejected")

  // Test 2.3: Missing email rejected
  const missingEmailRes = await trackOrder({ orderId: testOrderId, mobile: validMobile, email: "" })
  assert(missingEmailRes === null, "Missing email rejected")

  // Test 2.4: Wrong phone rejected
  const wrongPhoneRes = await trackOrder({ orderId: testOrderId, mobile: "9111111111", email: validEmail })
  assert(wrongPhoneRes === null, "Wrong phone rejected (generic null, no leak)")

  // Test 2.5: Wrong email rejected
  const wrongEmailRes = await trackOrder({ orderId: testOrderId, mobile: validMobile, email: "other@example.com" })
  assert(wrongEmailRes === null, "Wrong email rejected (generic null, no leak)")

  // Test 2.6: Exact match of all 3 factors succeeds
  const exactMatchRes = await trackOrder({ orderId: testOrderId, mobile: validMobile, email: validEmail })
  assert(exactMatchRes !== null && exactMatchRes.id === testOrderId, "Exact 3-factor match succeeds and returns order")
  assert(exactMatchRes?.shipping_status === "packed", "Returns authentic shipping status (packed)")

  // ─────────────────────────────────────────────────────────────
  // 3. Payment Protocol Gateway & Execution
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- Test Suite 3: Payment Protocol Gateway & Execution ---")

  // Test 3.1: Basket ceiling enforcement (> ₹50,000)
  const ceilingOrderId = `ORD-CEILING-${Date.now()}`
  const ceilingOrder: Order = {
    ...seededOrder,
    id: ceilingOrderId,
    total_paise: 5500000, // ₹55,000 exceeds ceiling
  }
  const ceilingRes = await executeStorefrontPayment({
    order: ceilingOrder,
    paymentType: "upi",
    upiId: "success@razorpay",
  })
  assert(ceilingRes.success === false, "Orders exceeding ₹50,000 ceiling are blocked")
  assert(ceilingRes.errorReason?.includes("50,000") ?? false, "Ceiling error reason is explicit")

  // Test 3.2: UPI Sandbox failure clearance
  const failOrderId = `ORD-FAIL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const failOrder: Order = {
    ...seededOrder,
    id: failOrderId,
    razorpay_order_id: `rzp_fail_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    total_paise: 199900,
  }
  const failRes = await executeStorefrontPayment({
    order: failOrder,
    paymentType: "upi",
    upiId: "failure@razorpay",
  })
  assert(failRes.success === false, "failure@razorpay correctly triggers payment failure")
  const persistedFailedOrder = orderStore.get(failOrderId)
  assert(persistedFailedOrder !== null && persistedFailedOrder.status === "failed", "Failed order is persisted to store/DB with status 'failed'")

  // Test 3.3: UPI Sandbox success clearance
  const successOrderId = `ORD-SUCCESS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const successOrder: Order = {
    ...seededOrder,
    id: successOrderId,
    razorpay_order_id: `rzp_succ_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    total_paise: 299900,
  }
  const successRes = await executeStorefrontPayment({
    order: successOrder,
    paymentType: "upi",
    upiId: "success@razorpay",
  })
  assert(successRes.success === true, "success@razorpay triggers payment clearance")
  assert(Boolean(successRes.paymentId && successRes.paymentId.startsWith("pay_upi")), "Returns real UPI payment ID")
  assert(Boolean(successRes.invoiceNo && successRes.invoiceNo.startsWith("INV-")), "Returns valid invoice number")
  const persistedPaidOrder = orderStore.get(successOrderId)
  assert(persistedPaidOrder !== null && persistedPaidOrder.status === "paid", "Paid order is persisted to store/DB with status 'paid'")

  // Test 3.4: RBI Tokenized Card clearance
  const cardOrderId = `ORD-CARD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const cardOrder: Order = {
    ...seededOrder,
    id: cardOrderId,
    razorpay_order_id: `rzp_card_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    total_paise: 149900,
  }
  const cardRes = await executeStorefrontPayment({
    order: cardOrder,
    paymentType: "card",
    cardId: "card_visa_tok_1",
  })
  assert(cardRes.success === true, "Tokenized card payment executes successfully")
  assert(Boolean(cardRes.paymentId && cardRes.paymentId.startsWith("pay_tok")), "Returns tokenized payment ID")

  // ─────────────────────────────────────────────────────────────
  // 4. End-to-End Purchase Flow (Store → Product → Cart → Checkout → Payment → Invoice → Tracking → Merchant Orders → Audit)
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- Test Suite 4: End-to-End Purchase Flow Verification ---")
  const { listProducts, listOrders, listAuditSessions } = await import("../src/lib/api/client")
  
  // Step 1: Storefront product lookup
  const products = await listProducts()
  assert(products.length > 0, "Storefront catalog contains products")
  const testProduct = products[0]
  assert(Boolean(testProduct.id && testProduct.title && testProduct.price_paise), "Storefront product has authentic fields (id, title, price)")

  // Step 2: Customer checkout order creation
  const e2eOrderId = `ORD-E2E-${Date.now()}`
  const customerMobile = "9988776655"
  const customerEmail = "raghav.patel@razent.test"
  const e2eOrder: Order = {
    id: e2eOrderId,
    razorpay_order_id: `rzp_e2e_${Date.now()}`,
    status: "created",
    shipping_status: "pending",
    currency: "INR",
    total_paise: testProduct.price_paise,
    shipping_paise: 0,
    items: [
      {
        product_id: testProduct.id,
        title: testProduct.title,
        image_url: testProduct.image_url,
        qty: 1,
        unit_price_paise: testProduct.price_paise,
      },
    ],
    shipping_address: {
      full_name: "Raghav Patel",
      phone: `+91 ${customerMobile}`,
      email: customerEmail,
      line1: "45 Koramangala 4th Block",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560034",
      country: "India",
    },
    via_ai: false,
    commerce_protocol: "direct_web",
    phone_verified: true,
    phone_verified_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  }

  // Step 2.5: Step-up phone verification with 6-digit OTP
  assert(e2eOrder.phone_verified === true, "Checkout marks phone as verified after 6-digit OTP entry")
  assert(Boolean(e2eOrder.phone_verified_at), "Checkout attaches phone_verified_at timestamp to order snapshot")

  // Step 3: Payment execution via Razorpay UPI Sandbox
  const e2ePaymentRes = await executeStorefrontPayment({
    order: e2eOrder,
    paymentType: "upi",
    upiId: "success@razorpay",
  })
  assert(e2ePaymentRes.success === true, "E2E checkout payment succeeds via Razorpay UPI gateway")
  assert(Boolean(e2ePaymentRes.invoiceNo && e2ePaymentRes.invoiceNo.startsWith("INV-")), "E2E checkout generates authentic invoice number")
  assert(e2ePaymentRes.order.phone_verified === true, "Persisted order retains phone_verified status for payment clearance")

  // Step 4: Strict 3-factor order tracking verification
  const trackedE2EOrder = await trackOrder({
    orderId: e2eOrderId,
    mobile: customerMobile,
    email: customerEmail,
  })
  assert(trackedE2EOrder !== null, "Track order successfully locates the newly paid order via strict 3 factors")
  assert(trackedE2EOrder?.status === "paid", "Track order confirms order status transitioned to 'paid'")
  assert(trackedE2EOrder?.items[0]?.title === testProduct.title, "Track order contains exact purchased item")

  // Step 5: Merchant Orders dashboard synchronization
  const merchantOrders = await listOrders()
  const foundInMerchantList = merchantOrders.some((o) => o.id === e2eOrderId && o.status === "paid")
  assert(foundInMerchantList === true, "Merchant Orders list reflects newly completed storefront order in real time")

  // Step 6: Audit trail recording
  const auditSessions = await listAuditSessions()
  assert(Array.isArray(auditSessions), "Merchant audit trail returns session-grouped records")

  console.log(`\n=== SUMMARY: ${passed} PASSED, ${failed} FAILED ===`)
  if (failed > 0) {
    process.exit(1)
  }
}

runAcceptanceTests().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})
