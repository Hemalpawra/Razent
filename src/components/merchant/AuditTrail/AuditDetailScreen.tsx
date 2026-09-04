"use client" /* Header */ /* Session header */ /* Timeline */ /* Bottom actions */

import { useEffect, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useUI } from "@/state/useUI"
import { listAuditSessions } from "@/lib/api/client"
import type { AuditSession } from "@/lib/types/audit"

export default function AuditDetailScreen() {
  const setActiveScreen = useUI((s) => s.setActiveScreen)
  const closeAuditDrawer = useUI((s) => s.closeAuditDrawer)
  const drawerAuditSessionId = useUI((s) => s.drawerAuditSessionId)

  const [session, setSession] = useState<AuditSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!drawerAuditSessionId) { setLoading(false); return }
    listAuditSessions()
      .then((sessions) => {
        const found = sessions.find((s) => s.session_id === drawerAuditSessionId) ?? null
        setSession(found)
      })
      .catch(() => setSession(null))
      .finally(() => setLoading(false))
  }, [drawerAuditSessionId])

  const handleBack = () => {
    closeAuditDrawer()
    setActiveScreen("audit_trail")
  }

  return (
    <div className="min-h-screen bg-background">
      {}
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur bg-white">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="p-1 rounded-md hover:bg-muted/30"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium text-foreground">Audit Trail</span>
        <span className="text-xs text-muted-foreground ml-auto">
          Session Detail
        </span>
      </header>

      <div className="p-4 flex-1">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : !session ? (
          <Card className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              No audit session found. Please go back to Audit Trail.
            </p>
            <Button variant="outline" onClick={handleBack} className="mt-4">
              Back to Audit Trail
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {}
            <Card className="p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/5 text-primary">
                  <Badge className="text-xs font-semibold text-primary">
                    {session.session_id}
                  </Badge>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-foreground">
                      {session.customer} · {session.actor_label}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Started {new Date(session.created_at).toLocaleDateString()}
                  </div>
                </div>
                <Badge variant="secondary" className="rounded-full text-xs">
                  {session.events.length} events
                </Badge>
              </div>
            </Card>

            {}
            <div className="space-y-3">
              {session.events?.map((event) => (
                <Card key={event.id} className="p-3 border-t border-border/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>
                      {event.type}: {event.result}{event.reason ? ` (${event.reason})` : ""}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between text-[10px]">
                    <span>
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                    <span>—</span>
                  </div>
                </Card>
              ))}
            </div>

            {}
            <div className="flex gap-2 pt-3">
              <Button
                variant="outline"
                className="flex-1 rounded-full bg-card text-xs"
              >
                View Session Details
              </Button>
              <Button
                variant="destructive"
                className="flex-1 rounded-full text-xs"
              >
                Delete Session
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
