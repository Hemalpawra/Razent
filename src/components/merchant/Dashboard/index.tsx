import {
  IndianRupee,
  ShoppingCart,
  Bot,
  TrendingUp,
  Wallet,
  ChevronDown,
  Download,
  LayoutGrid,
  ArrowUpRight,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

// Figma-matched Dashboard — shadcn light theme
// Structure: Header + 5 KPI cards + (Left: Overview + AI Performance) / Right: Needs Attention + Recent Activity
// Tokens: bg #f8fafc page, white cards border rgba(108,132,157,0.18), blue #305EFF / #2161e8, text #050505 #14213d #768ea7 #40566d

export default function DashboardScreen() {
  return (
    <div className="min-h-full bg-[#f8fafc] -m-6 p-6 lg:p-6">
      {/* Header — Figma Header: Dashboard title + subtitle left, controls right */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-heading text-[32px] font-semibold leading-[38px] tracking-tight text-[#050505]">
            Dashboard
          </h1>
          <p className="mt-1 text-[14px] leading-[20px] text-[#616d75] lg:text-[16px] lg:leading-[24px]">
            Get a real-time overview of your AI commerce performance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-9 rounded-[8px] bg-white px-3 text-[14px] font-medium text-[#050505] shadow-[inset_0px_-1px_0.5px_rgba(0,0,0,0.18),inset_0px_0px_0px_1px_#dee1e3] hover:bg-white"
          >
            May 20, 2025 - May 27, 2025
            <ChevronDown className="size-4 opacity-60" />
          </Button>
          <Button
            variant="outline"
            className="h-9 rounded-[8px] bg-white px-3 text-[14px] font-medium text-[#050505] shadow-[inset_0px_-1px_0.5px_rgba(0,0,0,0.18),inset_0px_0px_0px_1px_#dee1e3] hover:bg-white"
          >
            <Download className="size-4" />
            Export
          </Button>
          <div className="hidden items-center gap-3 pl-2 lg:flex">
            <div className="flex size-9 items-center justify-center rounded-full bg-[#2161e8] text-[12px] font-bold text-white">
              MS
            </div>
            <div className="leading-none">
              <div className="text-[12px] font-bold text-[#14213d]">Merchant Store</div>
              <div className="text-[11px] text-[#607092]">Super Admin</div>
            </div>
            <span className="text-xs text-[#14213d]">⌄</span>
          </div>
        </div>
      </div>

      {/* KPI strip — 5 cards */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={<IndianRupee className="size-4 text-[#305EFF]" />}
          label="Revenue Generated"
          value="₹1,000.00"
          delta="↑ 18.6% vs May 13 - May 19"
        />
        <KpiCard icon={<ShoppingCart className="size-4 text-[#305EFF]" />} label="Orders Created" value="256" delta="↑ 16.2% vs May 13 - May 19" />
        <KpiCard icon={<Bot className="size-4 text-[#305EFF]" />} label="AI Conversion Rate" value="24.5%" delta="↑ 5.3% vs May 13 - May 19" />
        <KpiCard icon={<TrendingUp className="size-4 text-[#305EFF]" />} label="Upsell Revenue" value="₹1,24,560" delta="↑ 22.8% vs May 13 - May 19" />
        <KpiCard icon={<Wallet className="size-4 text-[#305EFF]" />} label="Avg. Order Value" value="₹3,419" delta="↑ 2.7% vs May 13 - May 19" />
      </div>

      {/* Main grid: left 2 cols (Overview + AI Performance), right 1 col (Needs Attention + Recent Activity) */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Left column — 2/3 */}
        <div className="space-y-4 lg:col-span-2">
          <OverviewCard />
          <AiPerformanceCard />
        </div>

        {/* Right column — 1/3 */}
        <div className="space-y-4">
          <NeedsAttentionCard />
          <RecentActivityCard />
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  delta,
}: {
  icon: React.ReactNode
  label: string
  value: string
  delta: string
}) {
  return (
    <Card className="rounded-[12px] border-[rgba(108,132,157,0.18)] bg-white p-6 shadow-[0px_6px_32px_4px_rgba(175,182,187,0.06)]">
      <div className="flex gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-[rgba(48,94,255,0.09)]">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-medium leading-[20px] text-[#768ea7]">{label}</div>
          <div className="mt-1 text-[20px] font-semibold leading-[26px] text-black">{value}</div>
          <div className="mt-1 text-[10px] leading-[14px]">
            <span className="font-normal text-[#006c3f]">{delta.split(" vs")[0]} </span>
            <span className="text-[#40566d]">vs {delta.split(" vs")[1]}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

function OverviewCard() {
  return (
    <Card className="rounded-[12px] border-[rgba(108,132,157,0.18)] bg-white p-5 shadow-none">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-semibold leading-[24px] text-[#050505]">Overview</h3>
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-[8px] bg-white px-2 text-[12px] font-medium text-[#192839] shadow-[inset_0px_-1px_0.5px_rgba(0,0,0,0.18),inset_0px_0px_0px_1px_#dee1e3]"
        >
          7 Day
          <ChevronDown className="size-4" />
        </Button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        {/* Sales Overview chart */}
        <div>
          <div className="text-[14px] font-semibold leading-[20px] text-[#14213d]">Sales Overview</div>
          <div className="text-[12px] leading-[18px] text-[#616d75]">Revenue generated from AI assisted orders</div>

          <div className="relative mt-4 flex h-[216px]">
            {/* Y axis */}
            <div className="flex w-12 flex-col justify-between py-2 text-right text-[12px] leading-[16px] text-[#40566d]">
              <span>₹1.6L</span>
              <span>₹1.2L</span>
              <span>₹80K</span>
              <span>₹40K</span>
              <span>₹0</span>
            </div>
            {/* Chart area */}
            <div className="relative flex-1">
              {/* grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pb-6">
                <div className="h-px bg-[rgba(199,196,215,0.3)]" />
                <div className="h-px bg-[rgba(199,196,215,0.3)]" />
                <div className="h-px bg-[rgba(199,196,215,0.3)]" />
                <div className="h-px bg-[rgba(199,196,215,0.3)]" />
                <div className="h-px bg-[rgba(199,196,215,0.5)]" />
              </div>
              {/* SVG area chart — matches Figma path */}
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 361 192" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="revenueGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#305EFF" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#305EFF" stopOpacity="0.09" />
                  </linearGradient>
                </defs>
                {/* area */}
                <path
                  d="M0 120 L40 100 L80 90 L120 110 L160 70 L200 80 L240 40 L280 60 L320 30 L361 50 L361 192 L0 192 Z"
                  fill="url(#revenueGrad)"
                />
                {/* line */}
                <path
                  d="M0 120 L40 100 L80 90 L120 110 L160 70 L200 80 L240 40 L280 60 L320 30 L361 50"
                  fill="none"
                  stroke="#305EFF"
                  strokeWidth="2"
                />
                {/* dots */}
                {[0, 40, 80, 120, 160, 200, 240, 280, 320, 361].map((x, i) => {
                  const y = [120, 100, 90, 110, 70, 80, 40, 60, 30, 50][i]
                  return <circle key={i} cx={x} cy={y} r="3" fill="#305EFF" />
                })}
              </svg>
              {/* X axis */}
              <div className="absolute bottom-0 flex w-full justify-between px-1 text-center text-[12px] leading-[16px] text-[#40566d]">
                <span>
                  21
                  <br />
                  May
                </span>
                <span>
                  22
                  <br />
                  May
                </span>
                <span>
                  23
                  <br />
                  May
                </span>
                <span>
                  24
                  <br />
                  May
                </span>
                <span>
                  25
                  <br />
                  May
                </span>
                <span>
                  26
                  <br />
                  May
                </span>
                <span>
                  27
                  <br />
                  May
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Breakdown — donut */}
        <div className="border-l border-[#edf0f5] pl-5">
          <div className="text-[14px] font-semibold leading-[20px] text-[#14213d]">Revenue Breakdown</div>
          <div className="mt-4 flex flex-col items-center">
            <div className="relative size-[130px]">
              <svg viewBox="0 0 130 130" className="size-full -rotate-90">
                <circle cx="65" cy="65" r="46" fill="none" stroke="#CBDCFF" strokeWidth="38" />
                <circle
                  cx="65"
                  cy="65"
                  r="46"
                  fill="none"
                  stroke="#8DB2FF"
                  strokeWidth="38"
                  strokeDasharray={`${46 * 2 * Math.PI * 0.25} ${46 * 2 * Math.PI}`}
                  strokeDashoffset="0"
                />
                <circle
                  cx="65"
                  cy="65"
                  r="46"
                  fill="none"
                  stroke="#2161E8"
                  strokeWidth="38"
                  strokeDasharray={`${46 * 2 * Math.PI * 0.66} ${46 * 2 * Math.PI}`}
                  strokeDashoffset={`${-46 * 2 * Math.PI * 0.25}`}
                />
              </svg>
              <div className="absolute inset-[19px] flex flex-col items-center justify-center rounded-full bg-white">
                <div className="pt-4 text-[13px] font-bold leading-none text-[#14213d]">₹1,24,560</div>
                <div className="text-[10px] leading-none text-[#607092]">Total Revenue</div>
              </div>
            </div>
            <div className="mt-4 w-full space-y-1 text-[11px] leading-normal text-[#354a7a]">
              <div>
                <span className="text-[#305eff]">●</span> AI Conversations ₹82,750 (66%)
              </div>
              <div>
                <span className="text-[#b4cdfd]">●</span> Direct Sales ₹31,200 (25%)
              </div>
              <div>
                <span className="text-[#2950da]">●</span> Upsell & Cross-sell ₹10,610 (9%)
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

function AiPerformanceCard() {
  return (
    <Card className="rounded-[12px] border-[rgba(108,132,157,0.18)] bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-semibold leading-[24px] text-[#050505]">AI Performance</h3>
        <button className="text-[12px] font-bold leading-[18px] text-[#075be3]">View Analytics</button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {/* 4 small metrics */}
        <div className="col-span-2 grid grid-cols-2 gap-3">
          <MetricMini label="Conversations" value="156" delta="↑ 12% vs yesterday" />
          <MetricMini label="Products Shown" value="432" delta="↑ 18% vs yesterday" />
          <MetricMini label="Orders Created" value="18" delta="↑ 20% vs yesterday" />
          <MetricMini label="Conversion Rate" value="24.5%" delta="↑ 6.2% vs yesterday" />
        </div>

        {/* Funnel */}
        <div className="col-span-2 lg:col-span-3 rounded-[12px] border border-[rgba(108,132,157,0.18)] p-3">
          <div className="grid grid-cols-7 items-center gap-2 pb-3 text-[14px] font-semibold text-[#14213d]">
            <div className="col-span-5 text-[14px]">Conversation to Order Funnel</div>
            <div className="col-span-2 text-right text-[14px]">Conversion</div>
          </div>
          <Separator className="mb-3" />
          <div className="grid grid-cols-7 gap-2">
            <div className="col-span-2 flex flex-col justify-between text-[10px] font-medium text-[#40566d]">
              <div className="flex justify-between">
                <span>Conversations Started</span>
                <span className="font-semibold text-[#191c1d]">156</span>
              </div>
              <div className="flex justify-between">
                <span>Products Shown</span>
                <span className="font-semibold text-[#191c1d]">432</span>
              </div>
              <div className="flex justify-between">
                <span>Add to Cart</span>
                <span className="font-semibold text-[#191c1d]">36</span>
              </div>
              <div className="flex justify-between">
                <span>Orders Created</span>
                <span className="font-semibold text-[#191c1d]">18</span>
              </div>
            </div>
            <div className="col-span-3 flex items-center justify-center">
              {/* Funnel SVG — 4 steps */}
              <svg viewBox="0 0 177 139" className="h-[110px] w-[140px]">
                <path d="M0 0 L177 0 L140 40 L37 40 Z" fill="#0033E5" />
                <path d="M37 40 L140 40 L120 80 L57 80 Z" fill="#1566F1" />
                <path d="M57 80 L120 80 L105 110 L72 110 Z" fill="#5CA2F7" />
                <path d="M72 110 L105 110 L95 139 L82 139 Z" fill="#7FB2F9" />
              </svg>
            </div>
            <div className="col-span-2 flex flex-col justify-between border-l border-[rgba(108,132,157,0.18)] pl-3 text-right text-[10px] font-medium text-[#40566d]">
              <span>100%</span>
              <span>31.2%</span>
              <span>8.3%</span>
              <span>4.2%</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

function MetricMini({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div className="rounded-[8px] border border-[rgba(108,132,157,0.18)] bg-white p-3">
      <div className="text-[12px] font-medium leading-[18px] text-[#616d75]">{label}</div>
      <div className="mt-1 text-[20px] font-semibold leading-[26px] text-[#14213d]">{value}</div>
      <div className="mt-1 text-[10px] leading-[14px] text-[#079455]">{delta}</div>
    </div>
  )
}

function NeedsAttentionCard() {
  const items = [
    { icon: LayoutGrid, title: "Waiting for Payment", desc: "Orders pending payment", count: 7 },
    { icon: ShoppingCart, title: "Missing Shipping Details", desc: "Customer details incomplete", count: 4 },
    { icon: TrendingUp, title: "Out of Stock Products", desc: "Products out of stock", count: 3 },
    { icon: ArrowUpRight, title: "Abandoned High Value Chats", desc: "Potential revenue at risk", count: 5 },
    { icon: Bot, title: "Human Support Needed", desc: "Customer requested support", count: 2 },
  ] as const

  return (
    <Card className="rounded-[12px] border-[rgba(108,132,157,0.18)] bg-white p-5">
      <div className="flex items-center justify-between pb-3">
        <h3 className="text-[16px] font-semibold leading-[24px] text-[#050505]">Needs Attention</h3>
        <button className="text-[12px] font-bold leading-[18px] text-[#075be3]">View All</button>
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.title} className="flex items-center justify-between rounded-[8px] p-2 hover:bg-muted/40">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-[rgba(48,94,255,0.09)]">
                <it.icon className="size-4 text-[#305EFF]" />
              </div>
              <div>
                <div className="text-[14px] font-semibold leading-[20px] text-black">{it.title}</div>
                <div className="text-[12px] leading-[18px] text-[#40566d]">{it.desc}</div>
              </div>
            </div>
            <div className="text-[18px] font-semibold leading-[24px] text-[#305eff]">{it.count}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function RecentActivityCard() {
  const activities = [
    { time: "10:32 AM", label: "Order Created", status: "Success" as const },
    { time: "10:28 AM", label: "Payment Successful", status: "Success" as const },
    { time: "10:24 AM", label: "Products Compared", status: "Success" as const },
    { time: "10:20 AM", label: "Upsell Shown", status: "Success" as const },
    { time: "10:16 AM", label: "Payment Failed", status: "Failed" as const },
  ]

  return (
    <Card className="rounded-[12px] border-[rgba(108,132,157,0.18)] bg-white p-5">
      <div className="flex items-center justify-between pb-3">
        <h3 className="text-[16px] font-semibold leading-[24px] text-[#050505]">Recent Activity</h3>
        <button className="text-[12px] font-bold leading-[18px] text-[#075be3]">View All</button>
      </div>
      <div className="divide-y divide-[rgba(108,132,157,0.18)]">
        {activities.map((a) => (
          <div key={a.time + a.label} className="flex items-center gap-3 py-3">
            <span className="w-[55px] shrink-0 text-[10px] leading-none text-[#40566d]">{a.time}</span>
            <span className="flex-1 text-[12px] leading-none text-black">{a.label}</span>
            <span
              className={
                a.status === "Success"
                  ? "rounded-full bg-[rgba(0,162,81,0.09)] px-2 py-0.5 text-[12px] font-medium leading-[17px] tracking-[-0.156px] text-[#008743]"
                  : "rounded-full bg-[rgba(217,45,32,0.09)] px-2 py-0.5 text-[12px] font-medium leading-[17px] tracking-[-0.156px] text-[#d92d20]"
              }
            >
              {a.status}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
