import { XIcon, Bot, Star, Plus, Send, CheckCircle2, Circle, Clock, Search, Package, ShoppingCart, CreditCard, Link2, Truck, FileCheck, MapPin, Phone, User, Sparkles } from "lucide-react"
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Input } from "@/components/ui/input"
import { formatPrice } from "@/lib/types/product"
import type { Conversation } from "@/lib/types/conversation"

const PRODUCTS = [
  { id: "p1", name: "Air Purifier Pro", subtitle: "HEPA-13 · 99.97% removal · App control", price: 1699900, rating: 4.8, img: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=240&q=70&auto=format&fit=crop", added: true },
  { id: "p2", name: "CleanAir X1", subtitle: "Compact · 360° intake · Sleep mode", price: 1499900, rating: 4.6, img: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=240&q=70&auto=format&fit=crop", added: false },
  { id: "p3", name: "PureSense 300", subtitle: "Smart sensing · Auto mode · Filter alert", price: 1899900, rating: 4.7, img: "https://images.unsplash.com/photo-1581578017093-cd30fce4f9d1?w=240&q=70&auto=format&fit=crop", added: false },
]

const FBT = [
  { name: "HEPA Filter Replacement", price: 129900, img: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=120&q=70&auto=format&fit=crop" },
  { name: "Activated Carbon Filter", price: 79900, img: "https://images.unsplash.com/photo-1559666126-84f389727b9a?w=120&q=70&auto=format&fit=crop" },
  { name: "Air Quality Monitor", price: 249900, img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=120&q=70&auto=format&fit=crop" },
]

export default function ConversationDrawer({ open, onClose, conversation }: { open: boolean; onClose: () => void; conversation: Conversation | null }) {
  // Spec is fixed demo — use conversation prop only for title fallback, otherwise demo data
  const titleName = "ChatGPT Assistant"
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[560px] max-w-[96vw] overflow-hidden p-0 flex flex-col md:hidden">
        {/* Header — same shell in every state */}
        <div className="shrink-0 border-b bg-card px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Agent Conversation</h2>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close" className="-mr-1"><XIcon className="size-4" /></Button>
            <SheetTitle className="sr-only">Agent Conversation</SheetTitle>
            <SheetDescription className="sr-only">Agent conversation drawer</SheetDescription>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Avatar className="size-9"><AvatarFallback className="bg-primary text-primary-foreground"><Bot className="size-5" /></AvatarFallback></Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{titleName}</span>
                <Badge variant="success" className="rounded-full px-2 py-0 text-[11px]">Active</Badge>
              </div>
              <div className="text-[11px] leading-4 text-muted-foreground">Started 10:24 AM · May 27, 2025</div>
            </div>
            <Badge variant="secondary" className="rounded-full text-[11px]">AI Assistant</Badge>
          </div>
        </div>

        <Tabs defaultValue="conversation" className="flex flex-1 min-h-0 flex-col">
          <div className="shrink-0 px-5 pt-3 bg-card">
            <TabsList className="w-full justify-start gap-5 bg-transparent p-0 h-auto rounded-none border-b">
              <TabsTrigger value="conversation" className="rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-1 -mb-px bg-transparent shadow-none text-xs font-medium data-[selected]:border-primary data-[selected]:text-foreground aria-[selected=true]:border-primary aria-[selected=true]:text-foreground text-muted-foreground">Conversation</TabsTrigger>
              <TabsTrigger value="products" className="rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-1 -mb-px bg-transparent shadow-none text-xs font-medium data-[selected]:border-primary data-[selected]:text-foreground aria-[selected=true]:border-primary text-muted-foreground">Products</TabsTrigger>
              <TabsTrigger value="order" className="rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-1 -mb-px bg-transparent shadow-none text-xs font-medium data-[selected]:border-primary data-[selected]:text-foreground aria-[selected=true]:border-primary text-muted-foreground">Order</TabsTrigger>
              <TabsTrigger value="timeline" className="rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-1 -mb-px bg-transparent shadow-none text-xs font-medium data-[selected]:border-primary data-[selected]:text-foreground aria-[selected=true]:border-primary text-muted-foreground">Timeline</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Conversation tab */}
            <TabsContent value="conversation" className="m-0 px-5 py-4 space-y-4">
              <div className="flex flex-col gap-4">
                {/* Customer ask */}
                <Message align="end">
                  <MessageAvatar><Avatar className="size-7"><AvatarFallback className="bg-muted text-foreground"><User className="size-3.5" /></AvatarFallback></Avatar></MessageAvatar>
                  <MessageContent className="items-end">
                    <Bubble variant="muted" align="end"><BubbleContent>Looking for an air purifier under ₹20,000 for my living room.</BubbleContent></Bubble>
                    <span className="text-[10px] text-muted-foreground">10:24 AM</span>
                  </MessageContent>
                </Message>

                {/* AI reply with 3 product cards */}
                <Message align="start">
                  <MessageAvatar><Avatar className="size-7"><AvatarFallback className="bg-primary text-primary-foreground"><Bot className="size-3.5" /></AvatarFallback></Avatar></MessageAvatar>
                  <MessageContent className="items-start">
                    <Bubble variant="tinted" align="start"><BubbleContent>Found 3 options under ₹20,000 — tap to compare:</BubbleContent></Bubble>
                    <span className="text-[10px] text-muted-foreground">10:25 AM</span>
                  </MessageContent>
                </Message>

                <div className="grid gap-2 pl-10">
                  {PRODUCTS.map((p) => (
                    <Card key={p.id} className="rounded-xl bg-card p-2.5 shadow-sm">
                      <div className="flex gap-3">
                        <img src={p.img} alt={p.name} className="size-12 rounded-lg object-cover ring-1 ring-border/40" loading="lazy" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium leading-4 text-foreground">{p.name}</div>
                          <div className="text-[11px] leading-3 text-muted-foreground">{p.subtitle}</div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{formatPrice(p.price)}</span>
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600"><Star className="size-3 fill-amber-500 text-amber-500" />{p.rating}</span>
                          </div>
                        </div>
                        <Button size="sm" variant={p.added ? "secondary" : "outline"} className="h-7 shrink-0 rounded-full text-xs">{p.added ? "Added" : "View"}</Button>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Customer picks */}
                <Message align="end">
                  <MessageAvatar><Avatar className="size-7"><AvatarFallback className="bg-muted text-foreground"><User className="size-3.5" /></AvatarFallback></Avatar></MessageAvatar>
                  <MessageContent className="items-end">
                    <Bubble variant="muted" align="end"><BubbleContent>Go with Air Purifier Pro — looks good.</BubbleContent></Bubble>
                    <span className="text-[10px] text-muted-foreground">10:27 AM</span>
                  </MessageContent>
                </Message>

                <Message align="start">
                  <MessageAvatar><Avatar className="size-7"><AvatarFallback className="bg-primary text-primary-foreground"><Bot className="size-3.5" /></AvatarFallback></Avatar></MessageAvatar>
                  <MessageContent className="items-start">
                    <Bubble variant="default" align="start"><BubbleContent>Added Air Purifier Pro to cart. Shall I proceed to checkout?</BubbleContent></Bubble>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" className="h-7 rounded-full">Yes, proceed</Button>
                      <Button size="sm" variant="outline" className="h-7 rounded-full bg-card">Not now</Button>
                    </div>
                    <span className="text-[10px] text-muted-foreground">10:28 AM</span>
                  </MessageContent>
                </Message>
              </div>

              <Separator />

              {/* Input */}
              <div className="flex items-center gap-2">
                <Input placeholder="Type a message…" className="h-9 flex-1 rounded-full bg-card" />
                <Button size="icon" className="size-9 rounded-full"><Send className="size-4" /></Button>
              </div>
            </TabsContent>

            {/* Products tab */}
            <TabsContent value="products" className="m-0 px-5 py-4 space-y-4">
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Recommended Products</h3>
                <div className="mt-2 grid gap-2">
                  {PRODUCTS.map((p) => (
                    <Card key={p.id} className="rounded-xl bg-card p-3">
                      <div className="flex gap-3">
                        <img src={p.img} alt={p.name} className="size-12 rounded-lg object-cover" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-foreground">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.subtitle}</div>
                          <div className="mt-1 flex items-center gap-2"><span className="text-sm font-semibold text-foreground">{formatPrice(p.price)}</span><span className="inline-flex items-center gap-1 text-xs text-amber-600"><Star className="size-3 fill-amber-500" />{p.rating}</span></div>
                        </div>
                        <Badge variant={p.added ? "success" : "secondary"} className="h-6 shrink-0 rounded-full">{p.added ? "Added" : "View"}</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Products Compared</h3>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {PRODUCTS.map((p) => (
                    <Card key={p.id} className="shrink-0 rounded-xl bg-card p-2 w-[130px]">
                      <img src={p.img} alt={p.name} className="size-16 rounded-lg object-cover mx-auto" />
                      <div className="mt-2 text-xs font-medium text-foreground truncate">{p.name}</div>
                      <div className="text-[11px] text-muted-foreground">{formatPrice(p.price)}</div>
                      <div className="mt-1 flex justify-center"><Star className="size-3 fill-amber-500 text-amber-500" /><span className="ml-1 text-[11px]">{p.rating}</span></div>
                    </Card>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Selected Product</h3>
                <Card className="mt-2 rounded-xl border-primary/20 bg-primary/[0.04] p-3">
                  <div className="flex gap-3">
                    <img src={PRODUCTS[0].img} alt={PRODUCTS[0].name} className="size-12 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-foreground">{PRODUCTS[0].name}</div><div className="text-xs text-muted-foreground">{PRODUCTS[0].subtitle}</div><div className="mt-1 text-sm font-semibold text-foreground">{formatPrice(PRODUCTS[0].price)} <span className="text-xs font-normal text-muted-foreground">· Qty 1</span></div></div>
                    <Badge variant="success" className="rounded-full">Selected</Badge>
                  </div>
                </Card>
              </section>

              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Upsell / Cross-sell</h3>
                <Card className="mt-2 rounded-xl bg-amber-500/[0.06] border-amber-500/20 p-3">
                  <div className="flex gap-3">
                    <img src={FBT[2].img} alt="Air Quality Monitor" className="size-10 rounded-md object-cover" />
                    <div className="flex-1"><div className="text-sm font-medium text-foreground">Air Quality Monitor</div><div className="text-xs text-muted-foreground">Pairs well · {formatPrice(249900)}</div><div className="mt-1 inline-flex items-center gap-1 text-xs text-amber-600"><Star className="size-3 fill-amber-500" />4.7</div></div>
                    <Button size="sm" className="h-7 rounded-full">Add</Button>
                  </div>
                </Card>
              </section>

              <Separator />
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Frequently Bought Together</h3>
                <div className="mt-2 divide-y divide-border/50 rounded-xl border bg-card">
                  {FBT.map((item) => (
                    <div key={item.name} className="flex items-center gap-3 px-3 py-2.5">
                      <img src={item.img} alt={item.name} className="size-9 rounded-md object-cover ring-1 ring-border/40" />
                      <div className="min-w-0 flex-1"><div className="text-sm font-medium leading-4 text-foreground">{item.name}</div><div className="text-xs text-muted-foreground">{formatPrice(item.price)}</div></div>
                      <Button size="icon-sm" variant="outline" className="size-7 rounded-full bg-card"><Plus className="size-3.5" /></Button>
                    </div>
                  ))}
                </div>
              </section>
            </TabsContent>

            {/* Order tab */}
            <TabsContent value="order" className="m-0 px-5 py-4 space-y-4">
              <Card className="rounded-xl bg-card overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-3 border-b">
                  <img src={PRODUCTS[0].img} alt={PRODUCTS[0].name} className="size-12 rounded-lg object-cover" />
                  <div><div className="text-sm font-medium text-foreground">{PRODUCTS[0].name}</div><div className="text-xs text-muted-foreground">Qty 1 · {formatPrice(PRODUCTS[0].price)}</div></div>
                </div>
                <CardContent className="p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium text-foreground tabular-nums">{formatPrice(1699900)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span className="font-medium text-emerald-600">Free</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tax (18% GST)</span><span className="font-medium text-foreground tabular-nums">{formatPrice(305982)}</span></div>
                  <Separator />
                  <div className="flex justify-between text-[15px]"><span className="font-semibold text-foreground">Total</span><span className="font-semibold text-foreground tabular-nums">{formatPrice(2005882)}</span></div>
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-amber-500/[0.06] border-amber-500/20 p-3">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-amber-600" />
                  <span className="text-sm font-medium text-foreground">Payment Pending</span>
                  <Badge variant="warning" className="ml-auto rounded-full">Awaiting payment</Badge>
                </div>
                <p className="mt-1 text-xs leading-4 text-muted-foreground">Razorpay link shared. Payment awaited from customer.</p>
                <Button size="sm" className="mt-3 w-full rounded-full"><Link2 className="size-3.5" /> Share Payment Link</Button>
              </Card>

              <Card className="rounded-xl bg-card p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5"><MapPin className="size-3.5 text-muted-foreground" />Shipping Details</h3>
                  <Button size="sm" variant="outline" className="h-7 rounded-full bg-card text-xs">Edit Details</Button>
                </div>
                <div className="mt-3 space-y-1 text-sm leading-5">
                  <div className="flex items-center gap-2"><User className="size-3.5 text-muted-foreground" /><span className="font-medium text-foreground">Ananya Rao</span></div>
                  <div className="flex items-center gap-2"><Phone className="size-3.5 text-muted-foreground" /><span className="text-muted-foreground">+91 98765 43210</span></div>
                  <div className="flex items-start gap-2"><MapPin className="size-3.5 text-muted-foreground mt-0.5" /><span className="text-muted-foreground">12 4th Block, Koramangala, Bengaluru — 560034</span></div>
                </div>
              </Card>

              <Card className="rounded-xl bg-card p-4">
                <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5"><FileCheck className="size-3.5 text-muted-foreground" />Order Info</h3>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Razorpay Order ID</span><span className="font-mono font-medium text-foreground">rzp_2026_0027_AB12CD</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span className="text-foreground">May 27, 2025 · 10:28 AM</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Source</span><Badge variant="secondary" className="rounded-full text-[11px]">AI Assistant</Badge></div>
                </div>
              </Card>
            </TabsContent>

            {/* Timeline tab */}
            <TabsContent value="timeline" className="m-0 px-5 py-4">
              <div className="relative pl-6">
                <div className="absolute left-[11px] top-2 bottom-4 w-px bg-border" />
                <div className="space-y-4">
                  {[
                    { label: "Conversation Started", sub: "Customer initiated chat", time: "10:24 AM", done: true, icon: Sparkles },
                    { label: "Products Searched", sub: "AI searched catalog for air purifier < ₹20k", time: "10:25 AM", done: true, icon: Search },
                    { label: "Products Recommended", sub: "3 products shown in chat", time: "10:25 AM", done: true, icon: Package },
                    { label: "Product Added to Cart", sub: "Air Purifier Pro added · Qty 1", time: "10:27 AM", done: true, icon: ShoppingCart },
                    { label: "Order Created", sub: "Razorpay Order rzp_…AB12CD created", time: "10:28 AM", done: true, icon: FileCheck },
                    { label: "Payment Link Shared", sub: "Link sent to customer", time: "10:28 AM", done: true, icon: Link2 },
                    { label: "Payment Pending", sub: "Awaiting customer payment", time: "—", done: false, pending: true, icon: CreditCard },
                    { label: "Shipping Pending", sub: "Address collected, shipment not started", time: "—", done: false, icon: Truck },
                    { label: "Order Completed", sub: "Will mark paid and start tracking", time: "—", done: false, icon: CheckCircle2 },
                  ].map((step) => {
                    const Icon = step.icon
                    const color = step.done ? "bg-emerald-500 text-white border-emerald-500" : (step as any).pending ? "bg-amber-500 text-white border-amber-500" : "bg-card text-muted-foreground border-border"
                    const dotInner = step.done ? <CheckCircle2 className="size-3.5" /> : <Icon className="size-3.5" />
                    return (
                      <div key={step.label} className="relative flex gap-3">
                        <div className={"absolute -left-6 flex size-6 items-center justify-center rounded-full border-2 " + color}>{dotInner}</div>
                        <div className="flex-1 rounded-xl border bg-card p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{step.label}</span>
                            {step.done ? <Badge variant="success" className="ml-auto rounded-full text-[10px]">Done</Badge> : (step as any).pending ? <Badge variant="warning" className="ml-auto rounded-full text-[10px]">Pending</Badge> : <Badge variant="secondary" className="ml-auto rounded-full text-[10px]">Queued</Badge>}
                          </div>
                          <div className="text-xs leading-4 text-muted-foreground">{step.sub}</div>
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="size-3" />{step.time}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Bottom actions — fixed */}
        <div className="shrink-0 border-t bg-card px-5 py-3 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 rounded-full bg-card text-xs">View Full Conversation</Button>
          <Button variant="outline" size="sm" className="flex-1 rounded-full bg-card text-xs">Export Chat</Button>
          <Button size="sm" className="flex-1 rounded-full text-xs">Take Over Conversation</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
