"use client"

import {
  CaretLeftIcon,
  CaretRightIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react"
import {
  getForm,
  hasFormChoice,
  placeName,
  type LoadedMap,
} from "@workspace/game-data"
import { Badge } from "@workspace/ui/components/badge"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import Link from "next/link"
import { useState, type ReactNode } from "react"

import { speciesName } from "@/components/species-name"
import { Sprite } from "@/components/sprite"
import { admitsChanges } from "@/lib/runs/can-change"
import { historyOf } from "@/lib/runs/history"
import {
  findViewerPokemon,
  type EncounterState,
  type PokemonState,
  type ViewerPokemon,
} from "@/lib/runs/state"

import { CorrectDrawer } from "../../correct-drawer"
import { originNames } from "../../record-steps"
import { useRun } from "../../run-root"
import { useRunTab } from "../../run-tab"
import { useLoadedMap } from "../../use-map"
import { historyDate, historyText, type HistoryNames } from "./history-text"
import { PokemonDrawer, pokemonName, type PokemonSheet } from "./pokemon-drawer"

/**
 * The Pokémon screen: one of the viewer's Pokémon with its header, its
 * Pokémon section (nickname, Species, Form), its Encounter, and its History.
 */
export function PokemonScreen({ pokemonId }: { pokemonId: string }) {
  const { value: run } = useRun()
  const map = useLoadedMap()
  const [tab] = useRunTab()
  const back = {
    href: `/runs/${run.id}`,
    label: tab === "pokemon" ? "Back to Pokémon" : "Back to encounters",
  }
  const found = findViewerPokemon(run, pokemonId)
  const encounter = found?.journey.encounters.find(
    (candidate) => candidate.id === found.pokemon.encounterId
  )

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col">
      <header className="flex items-center px-2 pt-3 pb-1">
        <Link
          href={back.href}
          aria-label={back.label}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "size-11"
          )}
        >
          <CaretLeftIcon />
        </Link>
      </header>
      {map && found && encounter ? (
        <PokemonDetails map={map} shown={found} encounter={encounter} />
      ) : (
        <Missing
          title={map ? "This Pokémon is gone" : "Unknown game"}
          text={
            map
              ? "Its encounter was removed."
              : "This version of the app does not have the game of this run."
          }
          back={back}
        />
      )}
    </div>
  )
}

type MissingProps = {
  title: string
  text: string
  back: { href: string; label: string }
}

function Missing({ title, text, back }: MissingProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 pb-20 text-center">
      <h1 className="text-base font-medium">{title}</h1>
      <p className="text-muted-foreground">{text}</p>
      <Link
        href={back.href}
        className={cn(buttonVariants({ variant: "secondary" }), "mt-2")}
      >
        {back.label}
      </Link>
    </div>
  )
}

type PokemonDetailsProps = {
  map: LoadedMap
  shown: ViewerPokemon
  encounter: EncounterState
}

function PokemonDetails({ map, shown, encounter }: PokemonDetailsProps) {
  const { value: run } = useRun()
  const { journey, pokemon } = shown
  const [sheet, setSheet] = useState<PokemonSheet>("rename")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [correctOpen, setCorrectOpen] = useState(false)
  const runAdmits = admitsChanges(run)
  // A removed Pokémon keeps its Encounter actions but has no Pokémon ones.
  const editable = runAdmits && pokemon.removedAt === null
  const dead = pokemon.diedAt !== null
  const current = speciesName(map, pokemon.species.species)
  const formName = hasFormChoice(map, pokemon.species.species)
    ? (getForm(map, pokemon.species.species, pokemon.species.form)?.name ??
      "Unknown form")
    : null
  const status = statusOf(pokemon)
  const name = pokemonName(map, shown)
  const where =
    placeName(map, encounter.placeId, journey.gameId) ?? "Unknown location"
  const names: HistoryNames = {
    speciesName: (species) => speciesName(map, species),
    placeName: (place) => placeName(map, place, journey.gameId),
  }

  function open(next: PokemonSheet) {
    setSheet(next)
    setDrawerOpen(true)
  }

  return (
    <main className="flex flex-col gap-6 px-4 pt-1 pb-8">
      <div className="flex items-center gap-4">
        <Sprite
          map={map}
          species={pokemon.species.species}
          form={pokemon.species.form}
          size={64}
          className={cn(dead && "opacity-60")}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate text-xl font-medium">{name}</h1>
          <p className="text-muted-foreground">
            {formName ? `${current} · ${formName}` : current}
          </p>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      <Section title="Pokémon">
        <FactRow
          label="Nickname"
          value={pokemon.nickname ?? "No nickname"}
          muted={pokemon.nickname === null}
          verb="Rename"
          action={`Rename ${name}`}
          onOpen={editable ? () => open("rename") : undefined}
        />
        <FactRow
          label="Species"
          value={current}
          verb="Evolve"
          action={`Evolve ${name}, now ${current}`}
          onOpen={editable && !dead ? () => open("evolve") : undefined}
        />
        {formName ? (
          <FactRow
            label="Form"
            value={formName}
            verb="Change"
            action={`Change the form of ${name}`}
            onOpen={editable ? () => open("form") : undefined}
          />
        ) : null}
      </Section>

      <Section title="Encounter">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1.5 rounded-2xl bg-muted/60 px-4 py-3">
          <EncounterFact label="Location">
            {where} · slot {encounter.slot}
          </EncounterFact>
          <EncounterFact label="Species met">
            {encounter.met
              ? speciesName(map, encounter.met.species)
              : "Unknown"}
            <span className="block text-xs font-normal text-muted-foreground">
              It stays the same after an evolution.
            </span>
          </EncounterFact>
          <EncounterFact label="Outcome">Caught</EncounterFact>
          <EncounterFact label="Origin">
            {encounter.origin ? originNames[encounter.origin] : "Unknown"}
          </EncounterFact>
        </dl>
        {runAdmits ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 self-start"
            onClick={() => setCorrectOpen(true)}
          >
            <PencilSimpleIcon aria-hidden />
            Correct encounter
          </Button>
        ) : null}
      </Section>

      <Section title="History">
        <ol className="flex flex-col gap-2 px-1">
          {historyOf(encounter, pokemon).map((line) => (
            <li key={line.id} className="flex items-baseline gap-3">
              <span className="min-w-0 flex-1">
                {historyText(names, pokemon, line)}
              </span>
              <HistoryDate enteredAt={line.enteredAt} />
            </li>
          ))}
        </ol>
      </Section>

      <PokemonDrawer
        map={map}
        shown={shown}
        sheet={sheet}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
      <CorrectDrawer
        encounterId={encounter.id}
        open={correctOpen}
        onOpenChange={setCorrectOpen}
      />
    </main>
  )
}

type Status = {
  label: string
  variant: "secondary" | "outline" | "destructive"
}

function statusOf(pokemon: PokemonState): Status {
  if (pokemon.removedAt !== null)
    return { label: "Removed", variant: "outline" }
  if (pokemon.diedAt !== null) return { label: "Dead", variant: "destructive" }

  return pokemon.inParty
    ? { label: "Party", variant: "secondary" }
    : { label: "Box", variant: "outline" }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-1.5">
      <h2 className="text-xs font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}

type FactRowProps = {
  label: string
  value: string
  /** Shows the value quietly, as for "No nickname". */
  muted?: boolean
  verb: string
  /** The button's accessible name, such as "Rename Leafy". */
  action: string
  /** Opens its Drawer; absent when the fact cannot change. */
  onOpen?: () => void
}

/** One fact of the Pokémon section, a button to its Drawer when it can change. */
function FactRow({
  label,
  value,
  muted = false,
  verb,
  action,
  onOpen,
}: FactRowProps) {
  const content = (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn("truncate font-medium", muted && "text-muted-foreground")}
      >
        {value}
      </span>
    </span>
  )
  const className =
    "flex min-h-14 w-full items-center gap-3 rounded-2xl bg-muted/60 py-2 pr-3 pl-4 text-left"

  if (!onOpen) return <div className={className}>{content}</div>

  return (
    <button
      type="button"
      className={cn(className, "transition-colors hover:bg-muted")}
      aria-label={action}
      onClick={onOpen}
    >
      {content}
      <span className="text-xs font-medium text-primary">{verb}</span>
      <CaretRightIcon aria-hidden className="text-muted-foreground" />
    </button>
  )
}

function EncounterFact({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </>
  )
}

function HistoryDate({ enteredAt }: { enteredAt: number }) {
  // The server renders in its own time zone, so the browser's date may differ.
  const [thisYear] = useState(() => new Date().getFullYear())

  return (
    <time
      dateTime={new Date(enteredAt).toISOString()}
      className="shrink-0 text-xs text-muted-foreground"
      suppressHydrationWarning
    >
      {historyDate(enteredAt, thisYear)}
    </time>
  )
}
