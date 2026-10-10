"use client"

import { CaretLeftIcon, PlusIcon } from "@phosphor-icons/react"
import {
  getGame,
  getSpecies,
  placeName,
  placesOf,
  type LoadedMap,
  type PlaceRow,
} from "@workspace/game-data"
import { Badge } from "@workspace/ui/components/badge"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@workspace/ui/components/item"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { cn } from "@workspace/ui/lib/utils"
import Link from "next/link"
import { useState } from "react"

import { Sprite, UnknownSprite } from "@/components/sprite"
import { nextSlot } from "@/lib/runs/changes/record-encounter"
import {
  boxOf,
  graveyardOf,
  partyOf,
  PARTY_SIZE,
  viewerJourney,
  type EncounterState,
  type PokemonState,
  type RunKind,
} from "@/lib/runs/state"

import { RecordDrawer } from "./record-drawer"
import { useRun } from "./run-root"
import { useLoadedMap } from "./use-map"

const kindNames: Record<RunKind, string> = {
  solo: "Solo",
  soul_link: "Soul Link",
}

/**
 * The tracking screen of a Run: its header and the Encounters and Pokémon
 * tabs. A new Run lists only the Starter location, with "Record your
 * starter" until the player has an Encounter there.
 */
export function TrackingScreen() {
  const { value: run } = useRun()
  const map = useLoadedMap()
  const journey = viewerJourney(run)
  const gameName = (map && getGame(map, journey.gameId)?.name) ?? "Unknown game"
  const starter = map
    ? placesOf(map, journey.gameId).find((place) => place.kind === "starter")
    : undefined

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
            {gameName} · {run.kind ? kindNames[run.kind] : "Unknown kind"}
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
          {map && starter ? (
            <StarterSection map={map} starter={starter} />
          ) : (
            <section className="flex min-h-12 items-center border-b py-2.5">
              <h2 className="text-sm font-medium">Unknown location</h2>
            </section>
          )}
        </TabsContent>

        <TabsContent value="pokemon" className="flex flex-col gap-1 pb-10">
          <PokemonGroup
            map={map}
            title="Party"
            count={`${partyOf(journey).length} of ${PARTY_SIZE}`}
            pokemon={partyOf(journey)}
          />
          <PokemonGroup
            map={map}
            title="Box"
            count={String(boxOf(journey).length)}
            pokemon={boxOf(journey)}
          />
          <PokemonGroup
            map={map}
            title="Graveyard"
            count={String(graveyardOf(journey).length)}
            pokemon={graveyardOf(journey)}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

type StarterSectionProps = {
  map: LoadedMap
  starter: PlaceRow
}

function StarterSection({ map, starter }: StarterSectionProps) {
  const { value: run } = useRun()
  const [recording, setRecording] = useState(false)
  const journey = viewerJourney(run)
  const encounters = journey.encounters.filter(
    (encounter) => encounter.placeId === starter.id
  )

  return (
    <section
      aria-label={starter.name}
      className="flex flex-col gap-1.5 border-b py-2.5"
    >
      <h2 className="text-sm font-medium">{starter.name}</h2>
      {encounters.length === 0 ? (
        <Button
          type="button"
          size="lg"
          className="h-11 w-full"
          onClick={() => setRecording(true)}
        >
          <PlusIcon aria-hidden />
          Record your starter
        </Button>
      ) : (
        <ItemGroup className="gap-1.5">
          {encounters.map((encounter) => (
            <EncounterRow
              key={encounter.id}
              map={map}
              encounter={encounter}
              pokemon={journey.pokemon.find(
                (mon) => mon.encounterId === encounter.id
              )}
            />
          ))}
        </ItemGroup>
      )}
      <RecordDrawer
        placeId={starter.id}
        placeName={starter.name}
        slot={nextSlot(run, starter.id)}
        open={recording}
        onOpenChange={setRecording}
      />
    </section>
  )
}

type EncounterRowProps = {
  map: LoadedMap
  encounter: EncounterState
  /** The Encounter's Pokémon; none for a Failed Encounter. */
  pokemon: PokemonState | undefined
}

function EncounterRow({ map, encounter, pokemon }: EncounterRowProps) {
  const failed = encounter.outcome === "failed"
  const speciesName = encounter.met
    ? (getSpecies(map, encounter.met.species)?.name ?? "Unknown Pokémon")
    : "Species unknown"

  return (
    <Item role="listitem" variant="muted" size="sm">
      <ItemMedia className={cn(failed && "opacity-60")}>
        {encounter.met ? (
          <Sprite
            map={map}
            species={encounter.met.species}
            form={encounter.met.form}
            size={36}
          />
        ) : (
          <UnknownSprite size={36} />
        )}
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle>{speciesName}</ItemTitle>
        <ItemDescription>
          {pokemon ? fateLine(pokemon) : failed ? "Failed" : "Unknown outcome"}
        </ItemDescription>
      </ItemContent>
      {failed ? (
        <ItemActions>
          <Badge variant="outline">Failed</Badge>
        </ItemActions>
      ) : null}
    </Item>
  )
}

/** What became of an Encounter's Pokémon, under the Species met. */
function fateLine(pokemon: PokemonState): string {
  const where = pokemon.inParty ? "Party" : "Box"

  return `${pokemon.nickname ?? "No nickname"} · ${where}`
}

type PokemonGroupProps = {
  map: LoadedMap | undefined
  title: string
  /** Shown at the end of the header, such as "2 of 6". */
  count: string
  pokemon: PokemonState[]
}

function PokemonGroup({ map, title, count, pokemon }: PokemonGroupProps) {
  return (
    <section aria-label={title} className="flex flex-col gap-2 pt-1.5 pb-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">{title}</h2>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      {map && pokemon.length > 0 ? (
        <ItemGroup className="gap-1.5">
          {pokemon.map((mon) => (
            <PokemonRow key={mon.id} map={map} pokemon={mon} />
          ))}
        </ItemGroup>
      ) : null}
    </section>
  )
}

function PokemonRow({
  map,
  pokemon,
}: {
  map: LoadedMap
  pokemon: PokemonState
}) {
  const { value: run } = useRun()
  const journey = viewerJourney(run)
  const speciesName =
    getSpecies(map, pokemon.species.species)?.name ?? "Unknown Pokémon"
  const encounter = journey.encounters.find(
    (candidate) => candidate.id === pokemon.encounterId
  )
  const metAt =
    (encounter && placeName(map, encounter.placeId, journey.gameId)) ??
    "an unknown location"

  return (
    <Item role="listitem" variant="muted" size="sm">
      <ItemMedia>
        <Sprite
          map={map}
          species={pokemon.species.species}
          form={pokemon.species.form}
          size={36}
        />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle>{pokemon.nickname ?? speciesName}</ItemTitle>
        <ItemDescription>
          {pokemon.nickname ? speciesName : "No nickname"} · from {metAt}
        </ItemDescription>
      </ItemContent>
    </Item>
  )
}
