"use client"

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

const themes = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
]

const subscribeToNothing = () => () => {}

/**
 * Picks the theme of this browser through next-themes. The choice lives in
 * the browser, not on the account.
 */
export function ThemeToggle({ labelledBy }: { labelledBy: string }) {
  const { theme, setTheme } = useTheme()
  // The server cannot know the stored theme, so no item is pressed until
  // hydration ends.
  const hydrated = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  )
  const pressed = hydrated && theme ? [theme] : []

  return (
    <ToggleGroup
      aria-labelledby={labelledBy}
      variant="outline"
      spacing={0}
      className="w-full"
      value={pressed}
      onValueChange={([next]) => {
        // Pressing the pressed item empties the group; keep the theme.
        if (next) setTheme(next)
      }}
    >
      {themes.map(({ value, label }) => (
        <ToggleGroupItem key={value} value={value} className="h-11 flex-1">
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
