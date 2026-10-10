"use client"

import { CaretLeftIcon, PlusIcon } from "@phosphor-icons/react"
import {
  getGame,
  getSpecies,
  placesOf,
  type LoadedMap,
  type PlaceRow,
} from "@workspace/game-data"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
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
          <PokemonGroup map={map} title="Box" pokemon={boxOf(journey)} />
          <PokemonGroup
            map={map}
            title="Graveyard"
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
  const encounters = viewerJourney(run).encounters.filter(
    (encounter) => encounter.placeId === starter.id
  )

  return (
    <section aria-label={starter.name} className="border-b py-2.5">
      <h2 className="text-sm font-medium">{starter.name}</h2>
      {encounters.length === 0 ? (
        <Button
          type="button"
          variant="outline"
          className="mt-2 h-11 w-full border-dashed text-muted-foreground"
          onClick={() => setRecording(true)}
        >
          <PlusIcon aria-hidden />
          Record your starter
        </Button>
      ) : (
        <ItemGroup className="mt-1 gap-0">
          {encounters.map((encounter) => (
            <EncounterRow key={encounter.id} map={map} encounter={encounter} />
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

function EncounterRow({
  map,
  encounter,
}: {
  map: LoadedMap
  encounter: EncounterState
}) {
  const species = encounter.met
    ? getSpecies(map, encounter.met.species)
    : undefined

  return (
    <Item size="sm" className="px-0">
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
      <ItemContent>
        <ItemTitle>
          {encounter.met
            ? (species?.name ?? "Unknown Pokémon")
            : "Species unknown"}
        </ItemTitle>
        {encounter.outcome === "failed" ? (
          <ItemDescription>Failed</ItemDescription>
        ) : null}
      </ItemContent>
    </Item>
  )
}

type PokemonGroupProps = {
  map: LoadedMap | undefined
  title: string
  /** Shown after the title, such as "2 of 6". */
  count?: string
  pokemon: PokemonState[]
}

function PokemonGroup({ map, title, count, pokemon }: PokemonGroupProps) {
  return (
    <section aria-label={title} className="pt-1.5 pb-2">
      <h2 className="flex items-baseline gap-2 text-sm font-medium">
        {title}
        {count ? (
          <span className="text-xs font-normal text-muted-foreground">
            {count}
          </span>
        ) : null}
      </h2>
      {map && pokemon.length > 0 ? (
        <ItemGroup className="mt-1 gap-0">
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
  const speciesName =
    getSpecies(map, pokemon.species.species)?.name ?? "Unknown Pokémon"

  return (
    <Item size="sm" className="px-0">
      <Sprite
        map={map}
        species={pokemon.species.species}
        form={pokemon.species.form}
        size={36}
      />
      <ItemContent>
        <ItemTitle>{pokemon.nickname ?? speciesName}</ItemTitle>
        {pokemon.nickname ? (
          <ItemDescription>{speciesName}</ItemDescription>
        ) : null}
      </ItemContent>
    </Item>
  )
}
