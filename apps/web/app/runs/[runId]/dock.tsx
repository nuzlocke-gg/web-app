"use client"

import {
  CaretDownIcon,
  CaretUpIcon,
  PlusIcon,
  WarningIcon,
} from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import { Separator } from "@workspace/ui/components/separator"
import { useState } from "react"

import { WarningAlert } from "@/components/warning-alert"

import type { WarningText } from "./warning-text"

/** One Warning of the dock's list, with the Encounter whose row it marks. */
export type DockWarning = WarningText & { key: string; encounterId: string }

/** Props of {@link Dock}. */
export type DockProps = {
  /** Locations with no Encounter yet; hidden at 0. */
  remaining: number
  /** Opens the Add a location Drawer; absent when the Run admits no change. */
  onAdd?: () => void
  warnings: DockWarning[]
  /** Shows the row of an Encounter. */
  onGoTo: (encounterId: string) => void
}

/**
 * The floating dock at the bottom of both tabs of the tracking screen. On a
 * Run that admits changes: "Add a location", the count of locations with no
 * Encounter yet, and the Warnings button; otherwise the Warnings bar alone.
 * The Warnings open in a list under them. The screen keeps its content clear
 * of the dock with bottom padding.
 */
export function Dock({ remaining, onAdd, warnings, onGoTo }: DockProps) {
  const [listOpen, setListOpen] = useState(false)
  const count = warnings.length
  const open = listOpen && count > 0
  const label = `${count} ${count === 1 ? "warning" : "warnings"}`
  const Caret = open ? CaretDownIcon : CaretUpIcon

  if (!onAdd && count === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 mx-auto w-full max-w-md px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Collapsible
        open={open}
        onOpenChange={setListOpen}
        className="pointer-events-auto overflow-hidden rounded-3xl border bg-popover shadow-lg"
      >
        {onAdd ? (
          <div className="flex items-center gap-2.5 p-1.5">
            <Button type="button" size="lg" className="h-11" onClick={onAdd}>
              <PlusIcon aria-hidden />
              Add a location
            </Button>
            <span className="min-w-0 flex-1 truncate pr-2 text-right text-xs text-muted-foreground">
              {remaining > 0 ? `${remaining} remaining` : null}
            </span>
            {count > 0 ? (
              <>
                <Separator orientation="vertical" className="h-6 self-center" />
                <CollapsibleTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="lg"
                      className="h-11"
                      aria-label={label}
                    />
                  }
                >
                  <WarningIcon aria-hidden className="text-warning" />
                  {count}
                  <Caret aria-hidden />
                </CollapsibleTrigger>
              </>
            ) : null}
          </div>
        ) : (
          <CollapsibleTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="lg"
                className="h-12 w-full justify-start rounded-none px-4"
              />
            }
          >
            <WarningIcon aria-hidden className="text-warning" />
            <span className="flex-1 text-left">{label}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {open ? "Hide" : "Tap to see"}
            </span>
            <Caret aria-hidden />
          </CollapsibleTrigger>
        )}
        <CollapsibleContent className="max-h-[50svh] overflow-y-auto border-t px-2 pb-2">
          <h2 className="px-2 pt-3 pb-1.5 text-xs font-medium text-muted-foreground">
            Rules
          </h2>
          <div className="flex flex-col gap-1.5">
            {warnings.map((warning) => (
              <WarningAlert
                key={warning.key}
                rule={warning.rule}
                text={warning.text}
              >
                {/* Its tap area covers the whole Alert. */}
                <button
                  type="button"
                  className="col-start-2 mt-1 justify-self-start text-xs text-muted-foreground outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-3 focus-visible:after:ring-ring/30"
                  aria-label={`Show ${warning.where}`}
                  onClick={() => {
                    setListOpen(false)
                    onGoTo(warning.encounterId)
                  }}
                >
                  {warning.where}
                </button>
              </WarningAlert>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
