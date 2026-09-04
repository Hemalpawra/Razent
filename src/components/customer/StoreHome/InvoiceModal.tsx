import React from "react"
import { X, Printer, CheckCircle, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/types/product"

export interface InvoiceData {
  orderId: string
  invoiceNo: string
  date: string
  customerName: string
  phone: string
  email: string
  address: string
  items: Array<{ title: string; qty: number; unitPricePaise: number }>
  subtotalPaise: number
  deliveryPaise: number
  taxPaise: number
  totalPaise: number
  paymentMethod: string
  paymentId: string
  status: string
}

interface InvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  data: InvoiceData | null
}

export function InvoiceModal({ isOpen, onClose, data }: InvoiceModalProps) {
  if (!isOpen || !data) return null

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm print:p-0 print:bg-white print:fixed">
      <div className="relative w-full max-w-2xl rounded-xl border bg-background p-6 shadow-2xl print:border-none print:shadow-none print:p-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-4 print:border-b-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-primary">Razent Superstore</span>
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                TAX INVOICE
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              GSTIN: 29AABCU9603R1ZM · CIN: U72200KA2026PTC123456
            </p>
            <p className="text-xs text-muted-foreground">
              Merchant One Instant Quick-Commerce Pvt Ltd, Indiranagar, Bengaluru, KA 560038
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 h-8">
              <Printer className="size-3.5" /> Print / PDF
            </Button>
            <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8">
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Invoice Metadata */}
        <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b">
          <div>
            <span className="text-muted-foreground">Invoice No:</span>{" "}
            <span className="font-semibold text-foreground">{data.invoiceNo}</span>
            <br />
            <span className="text-muted-foreground">Order ID:</span>{" "}
            <span className="font-mono font-medium">{data.orderId}</span>
            <br />
            <span className="text-muted-foreground">Date & Time:</span> {data.date}
          </div>
          <div className="text-right">
            <span className="text-muted-foreground">Billed To:</span>
            <p className="font-semibold text-foreground">{data.customerName}</p>
            <p className="text-muted-foreground">{data.phone} · {data.email}</p>
            <p className="text-muted-foreground line-clamp-2">{data.address}</p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-4">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-2 font-medium">Item Description</th>
                <th className="py-2 text-center font-medium">Qty</th>
                <th className="py-2 text-right font-medium">Unit Price</th>
                <th className="py-2 text-right font-medium">GST (18%)</th>
                <th className="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((it, idx) => (
                <tr key={idx}>
                  <td className="py-2.5 font-medium">{it.title}</td>
                  <td className="py-2.5 text-center">{it.qty}</td>
                  <td className="py-2.5 text-right">{formatPrice(it.unitPricePaise)}</td>
                  <td className="py-2.5 text-right">{formatPrice(Math.round(it.unitPricePaise * it.qty * 0.18))}</td>
                  <td className="py-2.5 text-right font-semibold">
                    {formatPrice(Math.round(it.unitPricePaise * it.qty * 1.18))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="border-t pt-4 space-y-1 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatPrice(data.subtotalPaise)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Delivery Charges</span>
            <span>{data.deliveryPaise === 0 ? "FREE" : formatPrice(data.deliveryPaise)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Integrated GST (18%)</span>
            <span>{formatPrice(data.taxPaise)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2">
            <span>Grand Total Paid</span>
            <span className="text-primary">{formatPrice(data.totalPaise)}</span>
          </div>
        </div>

        {/* Payment Confirmation Footer */}
        <div className="mt-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="size-4 text-emerald-600" />
            <div>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">Payment Completed</span>
              <p className="text-[11px] text-muted-foreground">Method: {data.paymentMethod} · Ref: {data.paymentId}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3.5 text-emerald-600" /> NPCI / Razorpay Verified
          </div>
        </div>
      </div>
    </div>
  )
}
