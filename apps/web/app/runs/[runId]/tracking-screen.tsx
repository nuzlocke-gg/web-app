"use client"

import { CaretLeftIcon, CaretRightIcon, PlusIcon } from "@phosphor-icons/react"
import {
  getGame,
  getSpecies,
  placeName,
  placesOf,
  progressTotal,
  type LoadedMap,
  type PlaceId,
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
import { useEffect, useRef, useState } from "react"

import { Sprite, UnknownSprite } from "@/components/sprite"
import { admitsChanges } from "@/lib/runs/can-change"
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

import { CorrectDrawer } from "./correct-drawer"
import { EncounterDrawer, recordSheet, type Sheet } from "./encounter-drawer"
import {
  fateLine,
  listedPlaces,
  progressOf,
  slotCount,
  type Progress,
  type ProgressCell,
} from "./encounter-list"
import { Dock } from "./dock"
import { useRun } from "./run-root"
import { useLoadedMap } from "./use-map"

const kindNames: Record<RunKind, string> = {
  solo: "Solo",
  soul_link: "Soul Link",
}

type Tab = "encounters" | "pokemon"

/**
 * The tracking screen of a Run: its header, the Encounters and Pokémon tabs,
 * and the dock that adds a location. The Encounters list grows as the player
 * goes and ends with the Run's Progress.
 */
export function TrackingScreen() {
  const { value: run } = useRun()
  const map = useLoadedMap()
  const journey = viewerJourney(run)
  const gameName = (map && getGame(map, journey.gameId)?.name) ?? "Unknown game"
  const places = map ? placesOf(map, journey.gameId) : []
  const listed = listedPlaces(places, run)
  const progress = progressOf(listed, run, map ? progressTotal(map) : 0)
  const canAdd = map !== undefined && admitsChanges(run)
  const [tab, setTab] = useState<Tab>("encounters")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sheet, setSheet] = useState<Sheet>({ step: "places" })
  const [justAdded, setJustAdded] = useState<PlaceId | null>(null)
  const [correcting, setCorrecting] = useState<string | null>(null)
  const [correctOpen, setCorrectOpen] = useState(false)
  const savedAt = useRef<PlaceId | null>(null)

  // The screen opens on the newest location, at the end of the list.
  useEffect(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight })
  }, [])

  function openDrawer(next: Sheet) {
    setSheet(next)
    setDrawerOpen(true)
  }

  function openCorrect(encounterId: string) {
    setCorrecting(encounterId)
    setCorrectOpen(true)
  }

  function saved(place: PlaceRow) {
    const joined = !listed.some((listedPlace) => listedPlace.id === place.id)

    // The Badge marks only the location the last save added to the list.
    setJustAdded(joined ? place.id : null)

    savedAt.current = place.id
    setTab("encounters")
  }

  // Scrolls once the Drawer has closed: the modal scroll lock is gone by then.
  function scrollToSaved() {
    const placeId = savedAt.current

    savedAt.current = null

    if (placeId) {
      document
        .getElementById(placeSectionId(placeId))
        ?.scrollIntoView({ block: "nearest" })
    }
  }

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

      <Tabs
        value={tab}
        onValueChange={(next) => setTab(next as Tab)}
        className="flex-1 px-4"
      >
        {/* Each tab is a 44 px tap target; the list grows around them. */}
        <TabsList className="w-full group-data-horizontal/tabs:h-auto!">
          <TabsTrigger value="encounters" className="h-11!">
            Encounters
          </TabsTrigger>
          <TabsTrigger value="pokemon" className="h-11!">
            Pokémon
          </TabsTrigger>
        </TabsList>

        {/* The bottom padding keeps the end of each tab clear of the dock. */}
        <TabsContent value="encounters" className="pb-28">
          {map && listed.length > 0 ? (
            listed.map((place) => (
              <PlaceSection
                key={place.id}
                map={map}
                place={place}
                justAdded={place.id === justAdded}
                onRecordStarter={() =>
                  openDrawer(recordSheet(run, place, false))
                }
                onCorrect={canAdd ? openCorrect : undefined}
              />
            ))
          ) : (
            <section className="flex min-h-12 items-center border-b py-2.5">
              <h2 className="text-sm font-medium">Unknown location</h2>
            </section>
          )}
          <ProgressBlock
            progress={progress}
            onOpen={canAdd ? () => openDrawer({ step: "places" }) : undefined}
          />
        </TabsContent>

        <TabsContent value="pokemon" className="flex flex-col gap-1 pb-28">
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

      {canAdd ? (
        <Dock
          remaining={progress.remaining}
          onAdd={() => openDrawer({ step: "places" })}
        />
      ) : null}
      <EncounterDrawer
        open={drawerOpen}
        sheet={sheet}
        onSheetChange={setSheet}
        onOpenChange={setDrawerOpen}
        onSaved={saved}
        onClosed={scrollToSaved}
      />
      <CorrectDrawer
        encounterId={correcting}
        open={correctOpen}
        onOpenChange={setCorrectOpen}
      />
    </div>
  )
}

function placeSectionId(placeId: PlaceId): string {
  return `place-${placeId}`
}

type PlaceSectionProps = {
  map: LoadedMap
  place: PlaceRow
  /** Whether the last save made this location join the list. */
  justAdded: boolean
  onRecordStarter: () => void
  /** Opens the Correct Drawer from a Failed row; absent when nothing can change. */
  onCorrect?: (encounterId: string) => void
}

function PlaceSection({
  map,
  place,
  justAdded,
  onRecordStarter,
  onCorrect,
}: PlaceSectionProps) {
  const { value: run } = useRun()
  const journey = viewerJourney(run)
  const encounters = journey.encounters.filter(
    (encounter) => encounter.placeId === place.id
  )
  const recordStarter = place.kind === "starter" && encounters.length === 0
  const slots = slotCount(run, place.id)

  return (
    <section
      id={placeSectionId(place.id)}
      aria-label={place.name}
      // Scrolled to after a save; the margin keeps it clear of the dock.
      className="flex scroll-mt-4 scroll-mb-28 flex-col gap-1.5 border-b py-2.5"
    >
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 text-sm font-medium">{place.name}</h2>
        {slots > 1 ? (
          <span className="text-xs text-muted-foreground">{slots} slots</span>
        ) : null}
        {justAdded ? <Badge variant="secondary">Just added</Badge> : null}
      </div>
      {recordStarter ? (
        <Button
          type="button"
          size="lg"
          className="h-11 w-full"
          onClick={onRecordStarter}
        >
          <PlusIcon aria-hidden />
          Record your starter
        </Button>
      ) : (
        <ItemGroup className="gap-1.5">
          {encounters.map((encounter) => (
            <div key={encounter.id} role="listitem">
              <EncounterRow
                map={map}
                encounter={encounter}
                pokemon={journey.pokemon.find(
                  (mon) => mon.encounterId === encounter.id
                )}
                onCorrect={onCorrect}
              />
            </div>
          ))}
        </ItemGroup>
      )}
    </section>
  )
}

/** The fill of each kind of Progress cell, and of a location with none. */
const cellFills: Record<ProgressCell | "remaining", string> = {
  caught: "bg-primary",
  failed: "bg-destructive",
  unknown: "bg-muted-foreground",
  remaining: "bg-foreground/12",
}

/** One kind of cell in the Progress legend, with how many there are. */
type LegendEntry = {
  cell: ProgressCell | "remaining"
  name: string
  count: number
}

type ProgressBlockProps = {
  progress: Progress
  /** Opens the Add a location Drawer; absent when the Run admits no change. */
  onOpen?: () => void
}

function ProgressBlock({ progress, onOpen }: ProgressBlockProps) {
  const cells = [
    ...progress.cells,
    ...Array.from({ length: progress.remaining }, () => "remaining" as const),
  ]
  const legend: LegendEntry[] = [
    { cell: "caught", name: "Caught", count: progress.caught },
    { cell: "failed", name: "Failed", count: progress.failed },
    ...(progress.unknown > 0
      ? [
          {
            cell: "unknown",
            name: "Unknown",
            count: progress.unknown,
          } satisfies LegendEntry,
        ]
      : []),
    { cell: "remaining", name: "Remaining", count: progress.remaining },
  ]
  const summary = legend
    .map((entry) =>
      entry.cell === "remaining"
        ? `${entry.count} with no encounter yet.`
        : `${entry.count} ${entry.name.toLowerCase()}`
    )
    .join(", ")
  const content = (
    <>
      <span className="font-medium">
        {progress.done}/{progress.total} encounters
      </span>
      <span className="sr-only">
        {summary}
        {onOpen ? " Show them." : null}
      </span>
      <span
        aria-hidden
        className="grid w-full grid-cols-[repeat(auto-fill,minmax(6px,1fr))] gap-x-0.5 gap-y-[3px]"
      >
        {cells.map((cell, index) => (
          <span
            key={index}
            className={cn("h-2 rounded-[2px]", cellFills[cell])}
          />
        ))}
      </span>
      <span
        aria-hidden
        className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"
      >
        {legend.map((entry) => (
          <span key={entry.cell} className="inline-flex items-center gap-1.5">
            <span
              className={cn("size-2 rounded-[2px]", cellFills[entry.cell])}
            />
            {entry.name} {entry.count}
          </span>
        ))}
      </span>
    </>
  )
  const className = "mt-3 flex w-full flex-col gap-2 rounded-2xl p-3 text-left"

  return onOpen ? (
    <button
      type="button"
      className={cn(className, "transition-colors hover:bg-muted")}
      onClick={onOpen}
    >
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  )
}

type EncounterRowProps = {
  map: LoadedMap
  encounter: EncounterState
  /** The Encounter's Pokémon; none for a Failed Encounter. */
  pokemon: PokemonState | undefined
  /** Makes a Failed row open the Correct Drawer. */
  onCorrect?: (encounterId: string) => void
}

function EncounterRow({
  map,
  encounter,
  pokemon,
  onCorrect,
}: EncounterRowProps) {
  const failed = encounter.outcome === "failed"
  const dimmed = failed || (pokemon !== undefined && pokemon.diedAt !== null)
  const speciesName = encounter.met
    ? (getSpecies(map, encounter.met.species)?.name ?? "Unknown Pokémon")
    : "Species unknown"
  const correctable = failed && onCorrect !== undefined

  return (
    <Item
      variant="muted"
      size="sm"
      render={
        correctable ? (
          <button
            type="button"
            className="text-left hover:bg-muted"
            onClick={() => onCorrect(encounter.id)}
          />
        ) : undefined
      }
    >
      <ItemMedia className={cn(dimmed && "opacity-60")}>
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
        <ItemDescription>{fateLine(map, encounter, pokemon)}</ItemDescription>
      </ItemContent>
      {failed ? (
        <ItemActions>
          <Badge variant="outline">Failed</Badge>
          {correctable ? <CaretRightIcon aria-hidden /> : null}
        </ItemActions>
      ) : null}
    </Item>
  )
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
