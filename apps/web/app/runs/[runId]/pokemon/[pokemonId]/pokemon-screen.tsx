"use client"

import {
  ArrowCounterClockwiseIcon,
  CaretLeftIcon,
  CaretRightIcon,
  PencilSimpleIcon,
  SkullIcon,
} from "@phosphor-icons/react"
import {
  getForm,
  hasFormChoice,
  placeName,
  type LoadedMap,
} from "@workspace/game-data"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Badge } from "@workspace/ui/components/badge"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { cn } from "@workspace/ui/lib/utils"
import Link from "next/link"
import { useState, useSyncExternalStore, type ReactNode } from "react"

import { speciesName } from "@/components/species-name"
import { Sprite } from "@/components/sprite"
import { admitsChanges } from "@/lib/runs/can-change"
import { returnsToParty } from "@/lib/runs/changes/undo-death"
import { historyOf } from "@/lib/runs/history"
import { movePokemon, removePokemon, undoDeath } from "@/lib/runs/mutations"
import {
  findViewerPokemon,
  partyOf,
  PARTY_SIZE,
  type EncounterState,
  type PokemonState,
  type ViewerPokemon,
} from "@/lib/runs/state"

import { CorrectDrawer } from "../../correct-drawer"
import { originNames } from "../../record-steps"
import { useRun, useRunChange } from "../../run-root"
import { useRunTab } from "../../run-tab"
import { useLoadedMap } from "../../use-map"
import { historyDate, historyText, type HistoryNames } from "./history-text"
import { PokemonDrawer, pokemonName, type PokemonSheet } from "./pokemon-drawer"

/**
 * The Pokémon screen: one of the viewer's Pokémon with its header, its
 * Pokémon section (nickname, Species, Form), where it is or its death, its
 * Encounter, its History, and the actions Record death and Remove Pokémon.
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
  const change = useRunChange()
  const { journey, pokemon } = shown
  const [sheet, setSheet] = useState<PokemonSheet>("rename")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [correctOpen, setCorrectOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const runAdmits = admitsChanges(run)
  // A removed Pokémon keeps its Encounter actions but has no Pokémon ones.
  const removed = pokemon.removedAt !== null
  const editable = runAdmits && !removed
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

      {editable && !dead ? (
        <WhereSection
          shown={shown}
          onMove={(to) =>
            change(
              movePokemon({
                runId: run.id,
                moves: [{ pokemonId: pokemon.id, to }],
              }),
              "Move"
            )
          }
          onSwap={() => open("swap")}
        />
      ) : null}

      {dead && !removed ? (
        <GraveyardSection
          name={name}
          shown={shown}
          editable={editable}
          onEdit={() => open("death")}
          onUndo={() =>
            change(
              undoDeath({ runId: run.id, pokemonId: pokemon.id }),
              "Undo death"
            )
          }
        />
      ) : null}

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

      {editable && !dead ? (
        <section
          aria-label="Actions"
          className="flex flex-col gap-2 border-t pt-4"
        >
          <Button
            type="button"
            variant="destructive"
            size="lg"
            className="h-11"
            onClick={() => open("death")}
          >
            <SkullIcon aria-hidden />
            Record death
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="h-11"
            onClick={() => setRemoveOpen(true)}
          >
            Remove Pokémon
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Remove is for a trade or a release. The encounter stays.
          </p>
        </section>
      ) : null}

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
      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title={`Remove ${name}?`}
        description={`Do this when you traded ${name} away or released it. Its encounter at ${where} and its history stay. If ${name} died, record a death instead.`}
        cancel={`Keep ${name}`}
        action={`Remove ${name}`}
        destructive
        onConfirm={() =>
          change(
            removePokemon({
              runId: run.id,
              pokemonId: pokemon.id,
              removedAt: Date.now(),
            }),
            "Removal"
          )
        }
      />
    </main>
  )
}

type WhereSectionProps = {
  shown: ViewerPokemon
  /** Saves a move to where the player chose. */
  onMove: (to: "party" | "box") => void
  /** Opens the swap Drawer, for the Party when it is full. */
  onSwap: () => void
}

/** Party or Box for a living Pokémon, saved as soon as the player picks. */
function WhereSection({ shown, onMove, onSwap }: WhereSectionProps) {
  const { journey, pokemon } = shown
  const partyCount = partyOf(journey).length

  function choose(to: "party" | "box") {
    if (to === "party" && partyCount >= PARTY_SIZE) onSwap()
    else onMove(to)
  }

  return (
    <Section title="Where">
      <ToggleGroup
        aria-label="Where it is"
        variant="outline"
        spacing={0}
        className="w-full"
        value={[pokemon.inParty ? "party" : "box"]}
        onValueChange={([next]) => {
          // Pressing the pressed item empties the group; it stays where it is.
          if (next === "party" || next === "box") choose(next)
        }}
      >
        <ToggleGroupItem value="party" className="h-11 flex-1">
          Party
        </ToggleGroupItem>
        <ToggleGroupItem value="box" className="h-11 flex-1">
          Box
        </ToggleGroupItem>
      </ToggleGroup>
      <p className="px-1 text-xs text-muted-foreground">
        Your party, {partyCount} of {PARTY_SIZE}
      </p>
    </Section>
  )
}

type GraveyardSectionProps = {
  name: string
  shown: ViewerPokemon
  /** Shows Edit and Undo death. */
  editable: boolean
  onEdit: () => void
  onUndo: () => void
}

/** The death of a dead Pokémon, with Edit and Undo death for its player. */
function GraveyardSection({
  name,
  shown,
  editable,
  onEdit,
  onUndo,
}: GraveyardSectionProps) {
  const { journey, pokemon } = shown
  const [undoOpen, setUndoOpen] = useState(false)
  const goesBack = returnsToParty(journey, pokemon)
    ? `${name} goes back to the party.`
    : pokemon.inParty
      ? `${name} goes back to the box, because your party is full.`
      : `${name} goes back to the box.`

  return (
    <Section title="Graveyard">
      <div className="flex flex-col rounded-2xl border px-4 py-2.5">
        <span className="font-medium">
          {pokemon.deathLevel === null
            ? "Died"
            : `Died at level ${pokemon.deathLevel}`}
        </span>
        <span className="text-xs text-muted-foreground">
          {pokemon.deathCause
            ? `Cause: ${pokemon.deathCause}`
            : "No cause recorded"}
        </span>
      </div>
      {editable ? (
        <>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1"
              aria-label={`Edit the death of ${name}`}
              onClick={onEdit}
            >
              <PencilSimpleIcon aria-hidden />
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1"
              onClick={() => setUndoOpen(true)}
            >
              <ArrowCounterClockwiseIcon aria-hidden />
              Undo death
            </Button>
          </div>
          <p className="px-1 text-xs text-muted-foreground">
            For a mistake. {goesBack}
          </p>
          <ConfirmDialog
            open={undoOpen}
            onOpenChange={setUndoOpen}
            title={`Undo the death of ${name}?`}
            description={`Do this for a mistake only. ${goesBack} Its level, its cause, and the death line in its history are cleared.`}
            cancel="Keep death"
            action="Undo death"
            onConfirm={onUndo}
          />
        </>
      ) : null}
    </Section>
  )
}

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  /** The label of the button that closes it with no change. */
  cancel: string
  /** The label of the button that confirms. */
  action: string
  /** Shows the confirm button as destructive. */
  destructive?: boolean
  /** Saves the change; the dialog then closes. */
  onConfirm: () => void
}

/** A confirm for one change of the Pokémon screen. */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  cancel,
  action,
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel size="lg" className="h-11">
            {cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            size="lg"
            className="h-11"
            onClick={() => {
              onConfirm()
              // AlertDialogAction is a plain Button, not a Close.
              onOpenChange(false)
            }}
          >
            {action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
  const thisYear = useSyncExternalStore(
    subscribeToNothing,
    () => new Date().getFullYear(),
    // The server knows neither the reader's locale nor their time zone, so
    // the date renders only in the browser.
    () => null
  )

  return (
    <time
      dateTime={new Date(enteredAt).toISOString()}
      className="shrink-0 text-xs text-muted-foreground"
    >
      {thisYear === null ? null : historyDate(enteredAt, thisYear)}
    </time>
  )
}

function subscribeToNothing() {
  return () => {}
}
