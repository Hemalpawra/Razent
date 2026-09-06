/**
 * Explicit AI Shopping Assistant State Machine
 * Prevents UI drift and guarantees strict state-driven transitions.
 */

export type AssistantFlowState =
  | "idle"
  | "searching"
  | "comparing"
  | "recommendation ready"
  | "order review"
  | "approval needed"
  | "payment pending"
  | "payment success"
  | "payment failed"
  | "blocked"
  | "no results"

export interface StateTransitionContext {
  state: AssistantFlowState
  lastUpdated: string
  reason?: string
  activeProductsCount?: number
  pendingOrderId?: string
  totalAmountPaise?: number
  isPhoneVerified?: boolean
}

export class AssistantStateMachine {
  private currentState: AssistantFlowState = "idle"
  private context: StateTransitionContext = {
    state: "idle",
    lastUpdated: new Date().toISOString(),
  }

  public getState(): AssistantFlowState {
    return this.currentState
  }

  public getContext(): StateTransitionContext {
    return this.context
  }

  public transition(newState: AssistantFlowState, updates?: Partial<StateTransitionContext>): AssistantFlowState {
    this.currentState = newState
    this.context = {
      ...this.context,
      ...updates,
      state: newState,
      lastUpdated: new Date().toISOString(),
    }
    return this.currentState
  }

  public isActionAllowed(action: "checkout" | "pay" | "search" | "compare"): boolean {
    switch (action) {
      case "pay":
        // Payment can only proceed from approval needed or payment pending when phone is verified
        return this.currentState === "payment pending" && Boolean(this.context.isPhoneVerified)
      case "checkout":
        return this.currentState !== "blocked"
      case "search":
      case "compare":
        return this.currentState !== "payment pending"
      default:
        return true
    }
  }

  public getStatusBadge(): { text: string; variant: "default" | "success" | "warning" | "destructive" | "info" } {
    switch (this.currentState) {
      case "searching":
        return { text: "Searching live catalog...", variant: "info" }
      case "comparing":
        return { text: "Comparing items...", variant: "info" }
      case "recommendation ready":
        return { text: "Recommendations ready", variant: "default" }
      case "order review":
        return { text: "Reviewing order details", variant: "warning" }
      case "approval needed":
        return { text: "OTP / Confirmation required", variant: "warning" }
      case "payment pending":
        return { text: "Awaiting payment clearance", variant: "info" }
      case "payment success":
        return { text: "Order placed successfully", variant: "success" }
      case "payment failed":
        return { text: "Payment failed", variant: "destructive" }
      case "blocked":
        return { text: "Action blocked by guardrail", variant: "destructive" }
      case "no results":
        return { text: "No matching items", variant: "warning" }
      default:
        return { text: "Ready", variant: "default" }
    }
  }
}

export const assistantStateMachine = new AssistantStateMachine()
