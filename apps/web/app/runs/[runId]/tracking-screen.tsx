"use client"

import { CaretLeftIcon } from "@phosphor-icons/react"
import { buttonVariants } from "@workspace/ui/components/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { cn } from "@workspace/ui/lib/utils"
import Link from "next/link"

import type { RunKind } from "@/lib/runs/state"

import { useRun } from "./run-root"

const kindNames: Record<RunKind, string> = {
  solo: "Solo",
  soul_link: "Soul Link",
}

type TrackingScreenProps = {
  /** The name of the viewer's Game. */
  gameName: string
  /** The name of the Map's Starter location in the viewer's Game. */
  starterName: string
}

/**
 * The tracking screen of a Run: its header and the Encounters and Pokémon
 * tabs. A new Run lists only the Starter location.
 */
export function TrackingScreen({ gameName, starterName }: TrackingScreenProps) {
  const { value: run } = useRun()

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col">
      <header className="flex items-center gap-1 px-2 pt-3 pb-2">
        <Link
          href="/"
          aria-label="Back to your runs"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "size-11"
          )}
        >
          <CaretLeftIcon />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col pl-1">
          <h1 className="truncate text-base font-medium">{run.name}</h1>
          <p className="text-xs text-muted-foreground">
            {gameName} · {kindNames[run.kind]}
          </p>
        </div>
      </header>

      <Tabs defaultValue="encounters" className="flex-1 px-4">
        {/* Each tab is a 44 px tap target; the list grows around them. */}
        <TabsList className="w-full group-data-horizontal/tabs:h-auto!">
          <TabsTrigger value="encounters" className="h-11!">
            Encounters
          </TabsTrigger>
          <TabsTrigger value="pokemon" className="h-11!">
            Pokémon
          </TabsTrigger>
        </TabsList>

        <TabsContent value="encounters" className="pb-10">
          <section
            aria-label={starterName}
            className="flex min-h-12 items-center border-b py-2.5"
          >
            <h2 className="text-sm font-medium">{starterName}</h2>
          </section>
        </TabsContent>

        {/* Party, Box, and Graveyard fill in once a Run has Pokémon (NUZ-51). */}
        <TabsContent value="pokemon" className="flex flex-col gap-1 pb-10">
          <PokemonGroup title="Party" />
          <PokemonGroup title="Box" />
          <PokemonGroup title="Graveyard" />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PokemonGroup({ title }: { title: string }) {
  return (
    <section className="pt-1.5 pb-2">
      <h2 className="text-sm font-medium">{title}</h2>
    </section>
  )
}
