import type { DateRangeValue } from "@/components/shared/DateRangePicker"

export function toLocalDateString(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function matchesDateFilter(
  dateStr: string | undefined | null,
  filter: DateRangeValue
): boolean {
  if (!filter || filter.preset === "all") return true
  if (!dateStr) return false

  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return false

  const itemDateStr = toLocalDateString(d)
  const now = new Date()
  const todayStr = toLocalDateString(now)

  if (filter.preset === "today") {
    return itemDateStr === todayStr
  }

  if (filter.preset === "yesterday") {
    const yStr = toLocalDateString(new Date(now.getTime() - 86400000))
    return itemDateStr === yStr
  }

  if (filter.preset === "7d") {
    const start7d = toLocalDateString(new Date(now.getTime() - 7 * 86400000))
    return itemDateStr >= start7d && itemDateStr <= todayStr
  }

  if (filter.preset === "30d") {
    const start30d = toLocalDateString(new Date(now.getTime() - 30 * 86400000))
    return itemDateStr >= start30d && itemDateStr <= todayStr
  }

  if (filter.preset === "custom") {
    if (filter.startDate && itemDateStr < filter.startDate) return false
    if (filter.endDate && itemDateStr > filter.endDate) return false
    return true
  }

  return true
}
