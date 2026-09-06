import React from "react"
import { Loader2, Search, ShoppingBag, Truck, CheckCircle2 } from "lucide-react"

interface ToolExecutionPillProps {
  toolName: string
}

export const ToolExecutionPill: React.FC<ToolExecutionPillProps> = ({ toolName }) => {
  const getIcon = () => {
    if (toolName.toLowerCase().includes("search") || toolName.toLowerCase().includes("catalog")) {
      return <Search className="w-3.5 h-3.5 text-primary" />
    }
    if (toolName.toLowerCase().includes("cart")) {
      return <ShoppingBag className="w-3.5 h-3.5 text-primary" />
    }
    if (toolName.toLowerCase().includes("track") || toolName.toLowerCase().includes("order")) {
      return <Truck className="w-3.5 h-3.5 text-primary" />
    }
    return <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary animate-pulse">
      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
      {getIcon()}
      <span>{toolName}</span>
    </div>
  )
}

export default ToolExecutionPill
