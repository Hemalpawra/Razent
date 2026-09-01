export default function StoreHomePlaceholder() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/40 px-8 py-20 text-center">
      <div>
        <h2 className="font-heading text-xl font-medium">Customer Storefront</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Customer-facing screens (store browse, product detail, AI chat,
          checkout, tracking) will grow here. The merchant side is built first.
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Per AI_RULES.md §1 (customer screens stubbed for Supabase growth).
        </p>
      </div>
    </div>
  )
}