"use client"

import { PlusIcon } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"

/** Props of {@link Dock}. */
export type DockProps = {
  /** Locations with no Encounter yet; hidden at 0. */
  remaining: number
  onAdd: () => void
}

/**
 * The floating bar at the bottom of both tabs of the tracking screen, with
 * "Add a location" and the count of locations with no Encounter yet. The
 * screen keeps its content clear of the bar with bottom padding.
 */
export function Dock({ remaining, onAdd }: DockProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 mx-auto w-full max-w-md px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto flex items-center gap-2.5 rounded-3xl border bg-popover p-1.5 shadow-lg">
        <Button type="button" size="lg" className="h-11" onClick={onAdd}>
          <PlusIcon aria-hidden />
          Add a location
        </Button>
        {remaining > 0 ? (
          <span className="min-w-0 flex-1 truncate pr-2 text-right text-xs text-muted-foreground">
            {remaining} remaining
          </span>
        ) : null}
      </div>
    </div>
  )
}
