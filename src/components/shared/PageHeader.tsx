import type { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-4">
      <div>
        <h1 className="font-heading text-2xl font-medium tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}
