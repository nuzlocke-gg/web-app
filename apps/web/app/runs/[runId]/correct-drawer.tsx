"use client"

import {
  getSpecies,
  placeName,
  type FormRef,
  type LoadedMap,
  type Origin,
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
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldTitle,
} from "@workspace/ui/components/field"
import { Item, ItemContent, ItemTitle } from "@workspace/ui/components/item"
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
} from "@workspace/ui/components/drawer"
import { useId, useState } from "react"

import { useLeavePrompt } from "@/components/use-leave-prompt"
import { correctEncounter, removeEncounter } from "@/lib/runs/mutations"
import {
  findViewerEncounter,
  type EncounterOutcome,
  type EncounterState,
  type PokemonState,
  type ViewerEncounter,
} from "@/lib/runs/state"

import { DrawerHeaderRow, type Back } from "./drawer-header-row"
import {
  FormChoice,
  OriginChoice,
  SpeciesField,
  SpeciesStep,
} from "./record-steps"
import { useRun, useRunChange } from "./run-root"
import { useLoadedMap } from "./use-map"

type CorrectDrawerProps = {
  /** The viewer's Encounter to correct; kept while the Drawer closes. */
  encounterId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The Correct Drawer: the Species, Form, and origin met of one of the
 * viewer's Encounters, and "Remove encounter". The location, Slot, and
 * outcome are fixed; a wrong one is removed and recorded again. It closes
 * when the Encounter is gone.
 */
export function CorrectDrawer({
  encounterId,
  open,
  onOpenChange,
}: CorrectDrawerProps) {
  const { value: run } = useRun()
  const found = encounterId ? findViewerEncounter(run, encounterId) : undefined
  // The last Encounter shown stays while the Drawer closes, also after a
  // removal took it out of the Run.
  const [shown, setShown] = useState(found)

  if (found && found.encounter !== shown?.encounter) setShown(found)

  return (
    <Drawer
      open={open && found !== undefined}
      onOpenChange={onOpenChange}
      showSwipeHandle
    >
      <DrawerContent>
        {shown ? (
          <CorrectSteps
            key={shown.encounter.id}
            shown={shown}
            open={open}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}

/** What the player has set in the Correct Drawer so far. */
type CorrectDraft = {
  met: FormRef | null
  /** Null while the stored origin is one this build does not know. */
  origin: Origin | null
}

type CorrectStepsProps = {
  shown: ViewerEncounter
  open: boolean
  onClose: () => void
}

function CorrectSteps({ shown, open, onClose }: CorrectStepsProps) {
  const { value: run } = useRun()
  const change = useRunChange()
  const map = useLoadedMap()
  const { journey, encounter } = shown
  const [draft, setDraft] = useState<CorrectDraft>({
    met: encounter.met,
    origin: encounter.origin,
  })
  const [choosingSpecies, setChoosingSpecies] = useState(false)
  const [removing, setRemoving] = useState(false)

  useLeavePrompt(open && changed(encounter, draft))

  const where = map ? placeName(map, encounter.placeId, journey.gameId) : null
  const pokemon = journey.pokemon.find(
    (candidate) => candidate.encounterId === encounter.id
  )
  const failed = encounter.outcome === "failed"
  const back: Back | undefined = choosingSpecies
    ? {
        label: "Back to the encounter",
        onClick: () => setChoosingSpecies(false),
      }
    : undefined

  function save(origin: Origin) {
    change(
      correctEncounter({
        runId: run.id,
        encounterId: encounter.id,
        met: draft.met,
        origin,
      }),
      "Correction"
    )
    onClose()
  }

  function remove() {
    change(
      removeEncounter({ runId: run.id, encounterId: encounter.id }),
      "Encounter removal"
    )
    setRemoving(false)
    onClose()
  }

  return (
    <>
      <DrawerHeaderRow
        title="Correct the encounter"
        description={`${where ?? "Unknown location"} · slot ${encounter.slot}`}
        back={back}
      />
      {!map ? null : choosingSpecies ? (
        <SpeciesStep
          map={map}
          placeId={encounter.placeId}
          gameId={journey.gameId}
          allowUnknown={failed}
          onPick={(choice) => {
            setDraft({ ...draft, met: choice?.met ?? null })
            setChoosingSpecies(false)
          }}
        />
      ) : (
        <DetailsStep
          map={map}
          draft={draft}
          outcome={encounter.outcome}
          onChange={setDraft}
          onChangeSpecies={() => setChoosingSpecies(true)}
          onSave={save}
          onRemove={() => setRemoving(true)}
        />
      )}
      <RemoveDialog
        open={removing}
        onOpenChange={setRemoving}
        where={where ?? "this location"}
        pokemonName={map && pokemon ? nameOf(map, pokemon) : null}
        onRemove={remove}
      />
    </>
  )
}

function changed(encounter: EncounterState, draft: CorrectDraft): boolean {
  return (
    encounter.met?.species !== draft.met?.species ||
    encounter.met?.form !== draft.met?.form ||
    encounter.origin !== draft.origin
  )
}

function nameOf(map: LoadedMap, pokemon: PokemonState): string {
  return (
    pokemon.nickname ??
    getSpecies(map, pokemon.species.species)?.name ??
    "Its Pokémon"
  )
}

const outcomeNames: Record<EncounterOutcome, string> = {
  caught: "Caught",
  failed: "Failed",
}

type DetailsStepProps = {
  map: LoadedMap
  draft: CorrectDraft
  /** Shown, not editable; null when a newer build stored it. */
  outcome: EncounterOutcome | null
  onChange: (draft: CorrectDraft) => void
  onChangeSpecies: () => void
  onSave: (origin: Origin) => void
  onRemove: () => void
}

function DetailsStep({
  map,
  draft,
  outcome,
  onChange,
  onChangeSpecies,
  onSave,
  onRemove,
}: DetailsStepProps) {
  const id = useId()
  const { origin } = draft

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pt-3 pb-4">
        <SpeciesField
          map={map}
          title="Species met"
          met={draft.met}
          description={
            outcome === "failed"
              ? undefined
              : "It stays the same after an evolution."
          }
          onChange={onChangeSpecies}
        />

        <Field>
          <FieldTitle>Outcome</FieldTitle>
          <Item variant="muted" size="xs">
            <ItemContent>
              <ItemTitle>
                {outcome ? outcomeNames[outcome] : "Unknown"}
              </ItemTitle>
            </ItemContent>
          </Item>
          <FieldDescription>
            To change the outcome, remove the encounter and record it again.
          </FieldDescription>
        </Field>

        <OriginChoice
          id={`${id}-origin`}
          value={origin}
          description={origin ? undefined : "Select how you got it."}
          onChange={(next) => onChange({ ...draft, origin: next })}
        />

        <FormChoice
          id={`${id}-form`}
          map={map}
          met={draft.met}
          onChange={(met) => onChange({ ...draft, met })}
        />
      </div>
      <DrawerFooter className="pt-3">
        <Button
          type="button"
          size="lg"
          className="h-11"
          disabled={!origin}
          onClick={() => origin && onSave(origin)}
        >
          Save changes
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="lg"
          className="h-11"
          onClick={onRemove}
        >
          Remove encounter
        </Button>
      </DrawerFooter>
    </>
  )
}

type RemoveDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  where: string
  /** The Pokémon that goes with the Encounter; null for a Failed one. */
  pokemonName: string | null
  onRemove: () => void
}

function RemoveDialog({
  open,
  onOpenChange,
  where,
  pokemonName,
  onRemove,
}: RemoveDialogProps) {
  const goesWithIt = pokemonName
    ? `${pokemonName} goes with it, and so does its history. `
    : ""

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove the encounter at {where}?</AlertDialogTitle>
          <AlertDialogDescription>
            Do this for a mistake only. {goesWithIt}The slot is empty again. For
            a wrong location, slot, or outcome, remove it and record the
            encounter again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel size="lg" className="h-11">
            Keep encounter
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            size="lg"
            className="h-11"
            onClick={onRemove}
          >
            Remove encounter
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
