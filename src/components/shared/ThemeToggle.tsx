import { MoonIcon, SunIcon, MonitorIcon } from "lucide-react"

import { useTheme, type ThemeMode } from "@/state/useTheme"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const options: { value: ThemeMode; label: string; icon: typeof SunIcon }[] = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
]

export function ThemeToggle() {
  const mode = useTheme((s) => s.mode)
  const setMode = useTheme((s) => s.setMode)
  const Active = options.find((o) => o.value === mode)?.icon ?? MonitorIcon

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={`Theme: ${mode}`}
          />
        }
      >
        <Active />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-36 p-1">
        {options.map(({ value, label, icon: Icon2 }) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted " +
              (value === mode ? "bg-muted text-foreground" : "text-muted-foreground")
            }
          >
            <Icon2 className="size-3.5" />
            {label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}