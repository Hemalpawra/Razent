import { useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Store,
  Bot,
  Scale,
  Truck,
  Bell,
  ChevronRight,
  ArrowLeft,
  Save,
  RotateCcw,
  Mail,
  Phone,
  Image as ImageIcon,
  Sparkles,
  IndianRupee,
  Package,
  Shield,
} from "lucide-react"
import { useSettings } from "@/state/useSettings"

type Page = "hub" | "store" | "ai" | "business" | "shipping" | "notifications"

function PageHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string
  subtitle: string
  onBack?: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {onBack ? (
          <Button
            variant="ghost"
            size="sm"
            className="mb-1 -ml-2 h-7 gap-1 text-xs"
            onClick={onBack}
          >
            <ArrowLeft className="size-3.5" /> Back to Settings
          </Button>
        ) : null}
        <h1 className="font-heading text-[24px] font-semibold leading-7 tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          {subtitle}
        </p>
      </div>
      {onBack ? (
        <div className="hidden sm:flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg bg-card"
            onClick={onBack}
          >
            Cancel
          </Button>
          <Button size="sm" className="h-8 rounded-lg" onClick={onBack}>
            <Save className="size-3.5" /> Save
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function HubCard({
  icon: Icon,
  title,
  helper,
  onClick,
}: {
  icon: typeof Store
  title: string
  helper: string
  onClick: () => void
}) {
  return (
    <Card
      role="button"
      onClick={onClick}
      className="group cursor-pointer rounded-xl bg-card p-5 shadow-sm transition-colors hover:bg-muted/40"
    >
      <div className="flex items-center gap-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <div className="text-xs leading-4 text-muted-foreground">
            {helper}
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
      </div>
    </Card>
  )
}

export default function SettingsScreen() {
  const [page, setPage] = useState<Page>("hub")
  const s = useSettings()

  if (page !== "hub") {
    return (
      <div className="space-y-4 bg-muted/30 -m-6 p-6">
        {page === "store" && <StoreProfilePage onBack={() => setPage("hub")} />}
        {page === "ai" && <AIDefaultsPage onBack={() => setPage("hub")} />}
        {page === "business" && (
          <BusinessRulesPage onBack={() => setPage("hub")} />
        )}
        {page === "shipping" && (
          <DummyShippingPage onBack={() => setPage("hub")} />
        )}
        {page === "notifications" && (
          <NotificationsPage onBack={() => setPage("hub")} />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 bg-muted/30 -m-6 p-6">
      <div>
        <h1 className="font-heading text-[32px] font-semibold leading-[38px] tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Manage store, AI behavior, business rules, shipping and alerts.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <HubCard
          icon={Store}
          title="Store Profile"
          helper="Name, logo and support contact shown to customers"
          onClick={() => setPage("store")}
        />
        <HubCard
          icon={Bot}
          title="AI Defaults"
          helper="Tone, language and what AI asks before checkout"
          onClick={() => setPage("ai")}
        />
        <HubCard
          icon={Scale}
          title="Business Rules"
          helper="Currency, tax, pricing and stock behavior"
          onClick={() => setPage("business")}
        />
        <HubCard
          icon={Truck}
          title="Dummy Shipping"
          helper="Delivery promise and tracking stages (demo flow)"
          onClick={() => setPage("shipping")}
        />
        <HubCard
          icon={Bell}
          title="Notifications"
          helper="Choose which events ping the merchant"
          onClick={() => setPage("notifications")}
        />
      </div>

      <Card className="rounded-xl bg-card border-dashed">
        <CardContent className="flex items-center justify-between gap-4 p-4 text-xs text-muted-foreground">
          <span>
            Only the settings this product needs — no team or API admin.
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => s.resetAll()}
          >
            <RotateCcw className="size-3.5" /> Reset defaults
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── STORE PROFILE ───────────────────────────────────────────────────────────
function StoreProfilePage({ onBack }: { onBack: () => void }) {
  const { storeProfile, setStoreProfile } = useSettings()
  const [local, setLocal] = useState(storeProfile)
  const save = () => {
    setStoreProfile(local)
    onBack()
  }
  return (
    <div className="space-y-4">
      <PageHeader
        title="Store Profile"
        subtitle="Shown in header, storefront, invoice and AI messages."
        onBack={onBack}
      />
      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <Card className="rounded-xl bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Store details</CardTitle>
            <CardDescription className="text-xs">
              Updates everywhere customers see your store
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Store Name</Label>
                <Input
                  value={local.storeName}
                  onChange={(e) =>
                    setLocal({ ...local, storeName: e.target.value })
                  }
                  className="h-9 bg-card text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Header, storefront & customer messages
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Business Name</Label>
                <Input
                  value={local.businessName}
                  onChange={(e) =>
                    setLocal({ ...local, businessName: e.target.value })
                  }
                  className="h-9 bg-card text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Invoices & business documents
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <ImageIcon className="size-3.5" /> Logo URL
              </Label>
              <Input
                value={local.logo}
                onChange={(e) => setLocal({ ...local, logo: e.target.value })}
                placeholder="https://..."
                className="h-9 bg-card text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Storefront, header & invoice — leave blank for initials
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Mail className="size-3.5" /> Support Email
                </Label>
                <Input
                  value={local.supportEmail}
                  onChange={(e) =>
                    setLocal({ ...local, supportEmail: e.target.value })
                  }
                  className="h-9 bg-card text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Order contact & help areas
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Phone className="size-3.5" /> Support Phone
                </Label>
                <Input
                  value={local.supportPhone}
                  onChange={(e) =>
                    setLocal({ ...local, supportPhone: e.target.value })
                  }
                  className="h-9 bg-card text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Customer help & tracking page
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Preview — customer view</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center gap-2">
                {local.logo ? (
                  <img
                    src={local.logo}
                    alt="logo"
                    className="size-8 rounded-lg object-cover ring-1 ring-border/40"
                  />
                ) : (
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                    {local.storeName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {local.storeName}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {local.businessName}
                  </div>
                </div>
              </div>
              <Separator className="my-3" />
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="size-3" /> {local.supportEmail}
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="size-3" /> {local.supportPhone}
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs font-medium">Invoice header</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Sold by{" "}
                <span className="font-medium text-foreground">
                  {local.businessName}
                </span>{" "}
                · {local.supportEmail}
              </div>
            </div>
            <div className="rounded-lg bg-primary/10 p-3 text-xs leading-4">
              <span className="font-medium text-foreground">AI says:</span>{" "}
              <span className="text-muted-foreground">
                “Hi! I’m from {local.storeName} — how can I help you shop
                today?”
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          className="rounded-lg bg-card"
          onClick={onBack}
        >
          Cancel
        </Button>
        <Button className="rounded-lg" onClick={save}>
          <Save className="size-4" /> Save changes
        </Button>
      </div>
    </div>
  )
}

// ─── AI DEFAULTS ─────────────────────────────────────────────────────────────
function AIDefaultsPage({ onBack }: { onBack: () => void }) {
  const { aiDefaults, setAiDefaults } = useSettings()
  const [local, setLocal] = useState(aiDefaults)
  const save = () => {
    setAiDefaults(local)
    onBack()
  }
  const Row = ({
    title,
    desc,
    children,
  }: {
    title: string
    desc: string
    children: React.ReactNode
  }) => (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-card px-3 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-xs leading-4 text-muted-foreground">{desc}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Defaults"
        subtitle="How the AI speaks and what it asks before creating a Razorpay order."
        onBack={onBack}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Behavior
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row
              title="Enable AI Assistant"
              desc="Turn shopping AI on or off for the store"
            >
              <Switch
                checked={local.enabled}
                onCheckedChange={(v) => setLocal({ ...local, enabled: v })}
              />
            </Row>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Tone</Label>
                <Select
                  value={local.tone}
                  onValueChange={(v) =>
                    setLocal({ ...local, tone: v as never })
                  }
                >
                  <SelectTrigger className="h-9 bg-card text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="helpful">Helpful</SelectItem>
                    <SelectItem value="concise">Concise (short)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Voice in replies — friendly is warm, concise is brief
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Language</Label>
                <Select
                  value={local.language}
                  onValueChange={(v) =>
                    setLocal({ ...local, language: v as never })
                  }
                >
                  <SelectTrigger className="h-9 bg-card text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Hinglish">Hinglish</SelectItem>
                    <SelectItem value="Hindi">Hindi</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Main language for AI replies
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              What to ask before checkout
            </CardTitle>
            <CardDescription className="text-xs">
              More checks = stricter flow, fewer = faster
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row
              title="Ask for Shipping Address"
              desc="AI requests address before checkout"
            >
              <Switch
                checked={local.askShipping}
                onCheckedChange={(v) => setLocal({ ...local, askShipping: v })}
              />
            </Row>
            <Row title="Ask for Email" desc="For invoice & order tracking">
              <Switch
                checked={local.askEmail}
                onCheckedChange={(v) => setLocal({ ...local, askEmail: v })}
              />
            </Row>
            <Row title="Ask for Phone Number" desc="For tracking updates">
              <Switch
                checked={local.askPhone}
                onCheckedChange={(v) => setLocal({ ...local, askPhone: v })}
              />
            </Row>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Sales actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row
              title="Enable Upsell"
              desc="Suggest better / higher-value items"
            >
              <Switch
                checked={local.enableUpsell}
                onCheckedChange={(v) => setLocal({ ...local, enableUpsell: v })}
              />
            </Row>
            <Row
              title="Enable Cross-sell"
              desc="Suggest related add-ons & accessories"
            >
              <Switch
                checked={local.enableCrossSell}
                onCheckedChange={(v) =>
                  setLocal({ ...local, enableCrossSell: v })
                }
              />
            </Row>
            <p className="text-[11px] text-muted-foreground">
              Keep AI helpful — not noisy. Suggestions appear once per
              conversation.
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Order rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Row
              title="Auto Create Razorpay Order"
              desc="Prepare order after customer approval"
            >
              <Switch
                checked={local.autoCreateRazorpay}
                onCheckedChange={(v) =>
                  setLocal({ ...local, autoCreateRazorpay: v })
                }
              />
            </Row>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Approval Threshold for High-Value Orders (INR)
              </Label>
              <Input
                type="number"
                value={local.approvalThreshold}
                onChange={(e) =>
                  setLocal({
                    ...local,
                    approvalThreshold: Number(e.target.value) || 0,
                  })
                }
                className="h-9 bg-card text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Above this amount AI waits for explicit “Yes, pay now” —
                protects large payments. Set 0 to always ask.
              </p>
            </div>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs leading-4 text-amber-800 dark:text-amber-200">
              AI will never create an order without a clear customer approval
              step.
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          className="rounded-lg bg-card"
          onClick={onBack}
        >
          Cancel
        </Button>
        <Button className="rounded-lg" onClick={save}>
          <Save className="size-4" /> Save
        </Button>
      </div>
    </div>
  )
}

// ─── BUSINESS RULES ──────────────────────────────────────────────────────────
function BusinessRulesPage({ onBack }: { onBack: () => void }) {
  const { businessRules, setBusinessRules } = useSettings()
  const [local, setLocal] = useState(businessRules)
  const save = () => {
    setBusinessRules(local)
    onBack()
  }
  return (
    <div className="space-y-4">
      <PageHeader
        title="Business Rules"
        subtitle="Prices, taxes and order rules — AI and storefront both obey these."
        onBack={onBack}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-xl bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <IndianRupee className="size-4" /> Money
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Currency</Label>
              <Select
                value={local.currency}
                onValueChange={(v) =>
                  setLocal({ ...local, currency: v as never })
                }
              >
                <SelectTrigger className="h-9 bg-card text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR — Indian Rupee (₹)</SelectItem>
                  <SelectItem value="USD">USD — US Dollar ($)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                All prices, totals & Razorpay checkout use this
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tax Display</Label>
              <Select
                value={local.taxDisplay}
                onValueChange={(v) =>
                  setLocal({ ...local, taxDisplay: v as never })
                }
              >
                <SelectTrigger className="h-9 bg-card text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inclusive">
                    Inclusive — tax included in price
                  </SelectItem>
                  <SelectItem value="exclusive">
                    Exclusive — tax added at checkout
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Labels in cart & checkout change accordingly
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Order & discount</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Order Numbering</Label>
              <Select
                value={local.orderNumbering}
                onValueChange={(v) =>
                  setLocal({ ...local, orderNumbering: v as never })
                }
              >
                <SelectTrigger className="h-9 bg-card font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RAZ-YYYY-####">RAZ-YYYY-####</SelectItem>
                  <SelectItem value="ORD-####">ORD-####</SelectItem>
                  <SelectItem value="RZP-####">RZP-####</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Preview:{" "}
                {local.orderNumbering
                  .replace("YYYY", "2026")
                  .replace("####", "0142")}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Minimum Order (INR)</Label>
                <Input
                  type="number"
                  value={local.minOrderAmount}
                  onChange={(e) =>
                    setLocal({
                      ...local,
                      minOrderAmount: Number(e.target.value) || 0,
                    })
                  }
                  className="h-9 bg-card text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Blocks tiny orders
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Maximum Discount (%)</Label>
                <Input
                  type="number"
                  value={local.maxDiscount}
                  onChange={(e) =>
                    setLocal({
                      ...local,
                      maxDiscount: Number(e.target.value) || 0,
                    })
                  }
                  className="h-9 bg-card text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Caps coupon/discount
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-card sm:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="size-4" /> Stock rule
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {([
              {
                value: "block",
                label: "Block purchase",
                desc: "Show ‘Out of stock’ & stop checkout",
              },
              {
                value: "hide",
                label: "Hide product",
                desc: "Don’t show it in store or AI results",
              },
              {
                value: "warn",
                label: "Warn but allow",
                desc: "Let AI warn — customer decides",
              },
            ] as const).map((o) => (
              <button
                key={o.value}
                onClick={() => setLocal({ ...local, outOfStockRule: o.value })}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  local.outOfStockRule === o.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "bg-card hover:bg-muted/40"
                }`}
              >
                <div className="text-sm font-medium">{o.label}</div>
                <div className="text-xs text-muted-foreground">{o.desc}</div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          className="rounded-lg bg-card"
          onClick={onBack}
        >
          Cancel
        </Button>
        <Button className="rounded-lg" onClick={save}>
          <Save className="size-4" /> Save
        </Button>
      </div>
    </div>
  )
}

// ─── DUMMY SHIPPING ──────────────────────────────────────────────────────────
function DummyShippingPage({ onBack }: { onBack: () => void }) {
  const { dummyShipping, setDummyShipping } = useSettings()
  const [local, setLocal] = useState(dummyShipping)
  const [stageInput, setStageInput] = useState("")
  const save = () => {
    setDummyShipping(local)
    onBack()
  }
  const updateStage = (idx: number, val: string) =>
    setLocal({
      ...local,
      stages: local.stages.map((s, i) => (i === idx ? val : s)),
    })
  return (
    <div className="space-y-4">
      <PageHeader
        title="Dummy Shipping"
        subtitle="Demo tracking after payment — simple progress the customer can follow."
        onBack={onBack}
      />
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <Card className="rounded-xl bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Shipping settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-3">
                <div>
                  <div className="text-sm font-medium">Shipping Enabled</div>
                  <div className="text-xs text-muted-foreground">
                    Show tracking after payment
                  </div>
                </div>
                <Switch
                  checked={local.enabled}
                  onCheckedChange={(v) => setLocal({ ...local, enabled: v })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Default Delivery Time</Label>
                  <Select
                    value={local.defaultDeliveryTime}
                    onValueChange={(v) =>
                      setLocal({ ...local, defaultDeliveryTime: v })
                    }
                  >
                    <SelectTrigger className="h-9 bg-card text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2–3 days">2–3 days</SelectItem>
                      <SelectItem value="3–5 days">3–5 days</SelectItem>
                      <SelectItem value="5–7 days">5–7 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Promise on success page
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cut-off Time</Label>
                  <Input
                    value={local.cutoffTime}
                    onChange={(e) =>
                      setLocal({ ...local, cutoffTime: e.target.value })
                    }
                    placeholder="4:00 PM"
                    className="h-9 bg-card text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Next-day handling after this
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Tracking stages</CardTitle>
              <CardDescription className="text-xs">
                Edit labels — shown in success & track page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {local.stages.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {i + 1}
                  </span>
                  <Input
                    value={s}
                    onChange={(e) => updateStage(i, e.target.value)}
                    className="h-8 flex-1 bg-card text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() =>
                      setLocal({
                        ...local,
                        stages: local.stages.filter((_, j) => j !== i),
                      })
                    }
                    disabled={local.stages.length <= 2}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Input
                  value={stageInput}
                  onChange={(e) => setStageInput(e.target.value)}
                  placeholder="New stage label"
                  className="h-8 flex-1 bg-card text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg bg-card"
                  onClick={() => {
                    if (stageInput.trim()) {
                      setLocal({
                        ...local,
                        stages: [...local.stages, stageInput.trim()],
                      })
                      setStageInput("")
                    }
                  }}
                >
                  Add stage
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="rounded-xl bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Preview — customer view</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="text-xs font-medium text-foreground">
                Order #RAZ-2026-0142 ·{" "}
                {local.enabled ? "Tracking active" : "Tracking off"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Delivery: {local.defaultDeliveryTime} · Cut-off{" "}
                {local.cutoffTime}
              </div>
              <div className="relative ml-3 mt-4 border-l border-border/60 pl-6 space-y-4">
                {local.stages.map((st, i) => (
                  <div key={st + i} className="relative">
                    <span
                      className={`absolute -left-[25px] top-0.5 flex size-4 items-center justify-center rounded-full border ${
                        i === 0
                          ? "bg-primary border-primary"
                          : i === 1
                            ? "bg-primary/60 border-primary/60"
                            : "bg-muted border-border"
                      }`}
                    />
                    <div
                      className={`text-xs font-medium ${
                        i <= 1 ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {st}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {i === 0
                        ? "Now"
                        : i === 1
                          ? "Today, 2:30 PM"
                          : "Upcoming"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Not real shipping — demo progress only. Stages are editable here.
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          className="rounded-lg bg-card"
          onClick={onBack}
        >
          Cancel
        </Button>
        <Button className="rounded-lg" onClick={save}>
          <Save className="size-4" /> Save
        </Button>
      </div>
    </div>
  )
}

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
function NotificationsPage({ onBack }: { onBack: () => void }) {
  const { notifications, setNotifications } = useSettings()
  const [local, setLocal] = useState(notifications)
  const save = () => {
    setNotifications(local)
    onBack()
  }
  const Item = ({
    k,
    title,
    desc,
  }: {
    k: keyof typeof local
    title: string
    desc: string
  }) => (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-card px-3 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-xs leading-4 text-muted-foreground">{desc}</div>
      </div>
      <Switch
        checked={local[k]}
        onCheckedChange={(v) => setLocal({ ...local, [k]: v })}
      />
    </div>
  )
  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        subtitle="Choose what pings the merchant — keep it quiet or stay on top of every order."
        onBack={onBack}
      />
      <Card className="rounded-xl bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="size-4" /> Merchant alerts
          </CardTitle>
          <CardDescription className="text-xs">
            Green = important for money & customers — don’t miss these
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Item
            k="newConversation"
            title="New AI Conversation"
            desc="Customer starts talking to the AI"
          />
          <Item
            k="orderCreated"
            title="Order Created"
            desc="Razorpay order prepared after approval"
          />
          <Item
            k="paymentFailed"
            title="Payment Failed"
            desc="Payment didn’t go through — needs retry"
          />
          <Item
            k="lowStock"
            title="Product Low Stock"
            desc="Inventory at or below threshold"
          />
          <Item
            k="orderCompleted"
            title="Order Completed"
            desc="Delivery marked finished"
          />
          <Item
            k="humanSupport"
            title="Human Support Requested"
            desc="AI hands over to a human"
          />
          <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5 text-xs leading-4">
            <span className="font-medium text-foreground">Tip:</span>{" "}
            <span className="text-muted-foreground">
              Keep <b className="text-foreground">Payment Failed</b> and{" "}
              <b className="text-foreground">Order Created</b> on — they protect
              revenue. Turn off the rest if you want a quieter store.
            </span>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          className="rounded-lg bg-card"
          onClick={onBack}
        >
          Cancel
        </Button>
        <Button className="rounded-lg" onClick={save}>
          <Save className="size-4" /> Save
        </Button>
      </div>
    </div>
  )
}
