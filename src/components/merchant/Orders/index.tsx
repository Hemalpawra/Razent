import { SearchIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/shared/PageHeader"
import OrderDrawer from "@/components/merchant/Orders/OrderDrawer"
import { useUI } from "@/state/useUI"
import { listOrders, getOrder } from "@/lib/api/client"
import { formatPrice, type OrderStatus, type Order } from "@/lib/types/order"

import { mockOrders } from "@/lib/mock/orders"

export default function OrdersScreen() {
  const openDrawer = useUI((s) => s.openOrderDrawer)
  const drawerId = useUI((s) => s.drawerOrderId)
  const closeDrawer = useUI((s) => s.closeOrderDrawer)
  const selectedOrder = drawerId ? mockOrders.find((o) => o.id === drawerId) ?? null : null

  const filterStatus = "all"
  const q = ""
  const filtered: Order[] = mockOrders.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Review customer orders created through the storefront or the AI agent. When the backend lands, the same `listOrders()` call serves from Supabase."
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[16rem] md:max-w-md">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by order id..." readOnly disabled />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Order</th>
                <th className="text-left px-3 py-3">Customer</th>
                <th className="text-right px-3 py-3">Total</th>
                <th className="text-center px-3 py-3">Status</th>
                <th className="text-center px-3 py-3">Shipping</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          openDrawer(order.id)
                        }}
                        className="text-xs font-medium text-foreground hover:underline"
                      >
                        {order.id}
                      </a>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(order.created_at).toLocaleString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground truncate max-w-[10rem]">{order.shipping_address.full_name}</td>
                  <td className="px-3 py-3 text-right font-medium tabular-nums">{formatPrice(order.total_paise)}</td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={
                        "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap " +
                        (order.status === "paid"
                          ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300"
                          : order.status === "created"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                            : order.status === "failed"
                              ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                              : order.status === "refunded"
                                ? "bg-muted text-muted-foreground"
                                : "bg-muted text-muted-foreground")
                      }
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center text-xs text-muted-foreground capitalize">{order.shipping_status.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => openDrawer(order.id)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <OrderDrawer open={drawerId !== null} onClose={closeDrawer} order={selectedOrder} />
    </div>
  )
}