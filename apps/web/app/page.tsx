import {
  GearSixIcon,
  MapTrifoldIcon,
  PlusIcon,
} from "@phosphor-icons/react/ssr"
import { listMaps, type MapSummary } from "@workspace/game-data"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import Link from "next/link"

import { requireActor } from "@/lib/actor"
import { listRunsOf, type RunListRow } from "@/lib/runs/list"

import { RefreshOnFocus } from "./refresh-on-focus"
import { RunRow } from "./run-row"

export default async function HomePage() {
  const playerId = await requireActor()
  const runs = await listRunsOf(playerId)
  const maps = listMaps()

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col">
      <RefreshOnFocus />
      <header className="flex items-center gap-2 pt-3 pr-2 pb-1 pl-5">
        <span className="flex-1 text-base font-medium">nuzlocke.gg</span>
        <Link
          href="/settings"
          aria-label="Settings"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "size-11"
          )}
        >
          <GearSixIcon />
        </Link>
      </header>

      <main className="flex flex-col gap-4 px-4 pt-3 pb-10">
        <h1 className="pl-1 text-2xl font-medium">Your runs</h1>
        {runs.length === 0 ? <NoRuns /> : <RunList runs={runs} maps={maps} />}
      </main>
    </div>
  )
}

function NewRunLink({ className }: { className?: string }) {
  return (
    <Link
      href="/runs/new"
      className={cn(buttonVariants({ size: "lg" }), "h-11 w-full", className)}
    >
      <PlusIcon data-icon="inline-start" aria-hidden />
      New run
    </Link>
  )
}

function RunList({ runs, maps }: { runs: RunListRow[]; maps: MapSummary[] }) {
  return (
    <>
      <NewRunLink />
      <ul className="flex flex-col gap-2">
        {runs.map((run) => (
          <li key={run.id}>
            <RunRow run={run} maps={maps} />
          </li>
        ))}
      </ul>
    </>
  )
}

function NoRuns() {
  return (
    <div className="flex flex-col items-center gap-2 px-6 pt-20 text-center">
      <span
        aria-hidden
        className="grid size-14 place-items-center rounded-full bg-muted/60 text-muted-foreground"
      >
        <MapTrifoldIcon className="size-6" />
      </span>
      <h2 className="mt-2 text-base font-medium">No runs yet</h2>
      <p className="max-w-70 text-muted-foreground">
        Make a run to track your encounters, your party, and the Pokémon you
        lose.
      </p>
      <NewRunLink className="mt-4 max-w-70" />
      <p className="mt-6 max-w-70 text-xs text-muted-foreground">
        To play a Soul Link with friends, open the invite link that they send
        you.
      </p>
    </div>
  )
}
