"use client"

import {
  CaretRightIcon,
  DotsThreeIcon,
  SlidersHorizontalIcon,
} from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@workspace/ui/components/drawer"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@workspace/ui/components/item"
import Link from "next/link"

import { admitsChanges } from "@/lib/runs/can-change"
import { rulesOn } from "@/lib/runs/rules"
import type { RunLifeState } from "@/lib/runs/state"

import { DrawerHeaderRow } from "./drawer-header-row"
import type { Progress } from "./encounter-list"
import { useRun } from "./run-root"

const stateNames: Record<RunLifeState, string> = {
  waiting: "Waiting for players",
  active: "Active",
  failed: "Failed",
  complete: "Complete",
}

/**
 * The "…" button of the tracking screen header and the bottom Drawer it
 * opens, with the actions on the whole Run.
 */
export function RunMenu({ progress }: { progress: Progress }) {
  const { value: run } = useRun()
  const stateName = run.state ? stateNames[run.state] : "Unknown state"
  const editable = admitsChanges(run)
  const rulesCount = rulesOn(run.kind ?? "solo", run.rules).length

  return (
    <Drawer showSwipeHandle>
      <DrawerTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label="Run menu"
          />
        }
      >
        <DotsThreeIcon />
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeaderRow
          title={run.name}
          description={`${stateName} · ${progress.done}/${progress.total} encounters`}
        />
        <nav aria-label="Run menu" className="px-4 pt-2 pb-6">
          <ItemGroup>
            <Item size="sm" render={<Link href={`/runs/${run.id}/rules`} />}>
              <ItemMedia variant="icon">
                <SlidersHorizontalIcon
                  aria-hidden
                  className="text-muted-foreground"
                />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{editable ? "Set the rules" : "Rules"}</ItemTitle>
              </ItemContent>
              <ItemActions>
                <span className="text-xs text-muted-foreground">
                  {rulesCount} on
                </span>
                <CaretRightIcon aria-hidden />
              </ItemActions>
            </Item>
          </ItemGroup>
        </nav>
      </DrawerContent>
    </Drawer>
  )
}
