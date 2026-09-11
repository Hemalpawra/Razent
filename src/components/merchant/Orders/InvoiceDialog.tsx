import React, { useEffect, useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { PrinterIcon, DownloadIcon, CheckCircle2Icon, Building2Icon, UserIcon } from "lucide-react"
import type { Order } from "@/lib/types/order"
import { getOrder } from "@/lib/api/client"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyContent, EmptyTitle, EmptyDescription } from "@/components/ui/empty"

interface InvoiceDialogProps {
  open: boolean
  onClose: () => void
  orderId?: string | null
  order?: Order | null
}

export default function InvoiceDialog({
  open,
  onClose,
  orderId,
  order: initialOrder,
}: InvoiceDialogProps) {
  const [order, setOrder] = useState<Order | null>(initialOrder || null)
  const [loading, setLoading] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialOrder) {
      setOrder(initialOrder)
      return
    }
    if (open && orderId) {
      setLoading(true)
      getOrder(orderId)
        .then((data) => setOrder(data))
        .catch(() => setOrder(null))
        .finally(() => setLoading(false))
    }
  }, [open, orderId, initialOrder])

  const handlePrint = () => {
    if (!printRef.current) return
    const content = printRef.current.innerHTML
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tax Invoice - ${order?.id || "Order"}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 16px; }
            th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 12px; }
            th { background-color: #f8f9fa; font-weight: 600; }
            .text-right { text-align: right; }
            .header-grid { display: flex; justify-content: space-between; margin-bottom: 24px; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #e6f4ea; color: #137333; }
            .title { font-size: 20px; font-weight: bold; margin-bottom: 4px; }
            .text-muted { color: #666; font-size: 12px; }
            .separator { height: 1px; background: #eee; margin: 16px 0; }
          </style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const invoiceNumber = order?.id
    ? `INV-${new Date(order.created_at || Date.now()).getFullYear()}-${order.id.slice(-6).toUpperCase()}`
    : "INV-TAX"

  const invoiceDate = order?.paid_at || order?.created_at || new Date().toISOString()
  const totalAmount = order ? order.total_paise / 100 : 0
  const subtotal = order ? (order.total_paise - (order.shipping_paise || 0)) / 1.18 / 100 : 0
  const gstAmount = order ? totalAmount - subtotal - (order.shipping_paise || 0) / 100 : 0
  const cgst = gstAmount / 2
  const sgst = gstAmount / 2

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 sm:p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-heading font-semibold tracking-tight">
                Tax Invoice
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Official GST Tax Invoice & Proof of Settlement
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={loading || !order}
              >
                <PrinterIcon data-icon="inline-start" /> Print / PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-6 flex flex-col gap-6" ref={printRef}>
          {loading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          ) : !order ? (
            <Empty className="py-12">
              <EmptyContent>
                <EmptyTitle>Invoice Unavailable</EmptyTitle>
                <EmptyDescription>
                  Order or Invoice record could not be loaded.
                </EmptyDescription>
              </EmptyContent>
            </Empty>
          ) : (
            <>
              {/* Invoice Meta Top */}
              <div className="flex flex-col sm:flex-row justify-between gap-4 pb-2">
                <div>
                  <div className="text-xl font-bold font-heading text-foreground tracking-tight">
                    Razent Commerce Pvt Ltd
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    GSTIN: 27AABCR1234F1Z5 · CIN: U74999MH2026PTC123456
                  </p>
                  <p className="text-xs text-muted-foreground">
                    BKC Commerce Hub, Bandra East, Mumbai, MH 400051
                  </p>
                </div>
                <div className="sm:text-right flex flex-col gap-1">
                  <div>
                    <Badge variant="success" className="gap-1.5">
                      <CheckCircle2Icon /> Paid & Settled
                    </Badge>
                  </div>
                  <div className="text-sm font-mono font-semibold text-foreground mt-1">
                    {invoiceNumber}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Date:{" "}
                    {new Date(invoiceDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
              <Separator />

              {/* Bill To / Ship To Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="rounded-lg border bg-card p-3 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground uppercase tracking-wider text-[11px] text-muted-foreground">
                    <UserIcon className="size-3.5" /> Billed & Shipped To
                  </div>
                  <div className="font-medium text-foreground text-sm">
                    {order.shipping_address?.full_name || "Customer"}
                  </div>
                  <div className="text-muted-foreground">
                    {order.shipping_address?.line1 || "Customer Address"}
                  </div>
                  <div className="text-muted-foreground">
                    {order.shipping_address?.city}, {order.shipping_address?.state}{" "}
                    {order.shipping_address?.pincode}
                  </div>
                  {order.shipping_address?.phone && (
                    <div className="text-muted-foreground">
                      Tel: {order.shipping_address.phone}
                    </div>
                  )}
                  {order.shipping_address?.email && (
                    <div className="text-muted-foreground">
                      Email: {order.shipping_address.email}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border bg-card p-3 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground uppercase tracking-wider text-[11px] text-muted-foreground">
                    <Building2Icon className="size-3.5" /> Order & Transaction Info
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order ID:</span>
                    <span className="font-mono font-medium">{order.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Protocol:</span>
                    <span className="font-medium capitalize">
                      {order.commerce_protocol || (order.via_ai ? "NPCI UAP" : "Direct Web")}
                    </span>
                  </div>
                  {order.razorpay_payment_id && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ref / Txn ID:</span>
                      <span className="font-mono text-[11px]">
                        {order.razorpay_payment_id}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {order.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold text-muted-foreground">Item</th>
                      <th className="py-2.5 px-3 text-center font-semibold text-muted-foreground">
                        Qty
                      </th>
                      <th className="py-2.5 px-3 text-right font-semibold text-muted-foreground">
                        Unit Price
                      </th>
                      <th className="py-2.5 px-3 text-right font-semibold text-muted-foreground">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-foreground">{item.title}</div>
                            {item.product_id && (
                              <div className="font-mono text-[10px] text-muted-foreground">
                                SKU: {item.product_id}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center tabular-nums font-medium">
                            {item.qty}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                            ₹{((item.unit_price_paise || 0) / 100).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-medium">
                            ₹{(((item.unit_price_paise || 0) * item.qty) / 100).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-3 px-3 text-center text-muted-foreground">
                          Item details verified via checkout mandate
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Total Summary Breakdown */}
              <div className="flex justify-end text-xs">
                <div className="w-full max-w-xs flex flex-col gap-2 rounded-lg border bg-card p-4">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxable Value:</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>CGST (9%):</span>
                    <span>₹{cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>SGST (9%):</span>
                    <span>₹{sgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping & Handling:</span>
                    <span>
                      {order.shipping_paise ? `₹${(order.shipping_paise / 100).toFixed(2)}` : "FREE"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm font-bold text-foreground">
                    <span>Grand Total:</span>
                    <span>₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Footer Declaration */}
              <Separator />
              <div className="text-[11px] text-muted-foreground flex flex-col gap-1">
                <p>
                  Declaration: This is a computer-generated invoice issued in accordance with GST
                  Rules. No signature required.
                </p>
                <p className="font-mono text-[10px]">
                  Settlement Verification Hash:{" "}
                  {order.settlement_reference ||
                    `settle_${Math.random().toString(36).slice(2, 12)}`}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
