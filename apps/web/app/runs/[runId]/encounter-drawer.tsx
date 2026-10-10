"use client"

import { CaretRightIcon } from "@phosphor-icons/react"
import {
  getSpecies,
  placesOf,
  progressTotal,
  type LoadedMap,
  type PlaceRow,
} from "@workspace/game-data"
import { Drawer, DrawerContent } from "@workspace/ui/components/drawer"
import { Input } from "@workspace/ui/components/input"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@workspace/ui/components/item"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { useState } from "react"

import { Sprite, UnknownSprite } from "@/components/sprite"
import { nextSlot } from "@/lib/runs/changes/record-encounter"
import {
  viewerJourney,
  type EncounterState,
  type RunState,
} from "@/lib/runs/state"

import { DrawerHeaderRow } from "./drawer-header-row"
import {
  listedPlaces,
  placeChoices,
  progressOf,
  type PlaceChoiceGroup,
  type PlaceView,
} from "./encounter-list"
import { RecordSteps, type RecordDraft } from "./record-steps"
import { useRun } from "./run-root"
import { useLoadedMap } from "./use-map"

/** What the Encounter Drawer shows: the list of locations or the record steps. */
export type Sheet =
  | { step: "places" }
  | {
      step: "record"
      place: PlaceRow
      /** Fixed when the step opens, so a save or a refresh cannot move it. */
      slot: number
      /** Whether step 1 goes back to the list of locations. */
      fromPlaces: boolean
    }

/**
 * The record steps for a location, in a new Slot there.
 * @example
 * onSheetChange(recordSheet(run, starter, false))
 */
export function recordSheet(
  run: RunState,
  place: PlaceRow,
  fromPlaces: boolean
): Sheet {
  return {
    step: "record",
    place,
    slot: nextSlot(run, place.id),
    fromPlaces,
  }
}

/** The record drafts by location and Slot, from {@link draftKey}. */
type KeptDrafts = Record<string, RecordDraft | null>

type EncounterDrawerProps = {
  open: boolean
  /** Kept while the Drawer closes, so its content stays during the animation. */
  sheet: Sheet
  onSheetChange: (sheet: Sheet) => void
  onOpenChange: (open: boolean) => void
  /** Called when an Encounter is sent at a location; the Drawer then closes. */
  onSaved: (place: PlaceRow) => void
  /** Called once the Drawer has finished closing. */
  onClosed: () => void
}

/**
 * The one Drawer of the tracking screen: "Add a location" and the record
 * steps it leads to. Closing it at any step records nothing. The record draft
 * stays with its location and Slot, so opening them again, after a close or
 * a refused save, shows the same choices.
 */
export function EncounterDrawer({
  open,
  sheet,
  onSheetChange,
  onOpenChange,
  onSaved,
  onClosed,
}: EncounterDrawerProps) {
  const { value: run } = useRun()
  const [drafts, setDrafts] = useState<KeptDrafts>({})

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) onClosed()
      }}
      showSwipeHandle
    >
      <DrawerContent>
        {sheet.step === "places" ? (
          <AddPlaceStep
            onPick={(place) => onSheetChange(recordSheet(run, place, true))}
          />
        ) : (
          <RecordSteps
            key={draftKey(sheet)}
            placeId={sheet.place.id}
            placeName={sheet.place.name}
            slot={sheet.slot}
            open={open}
            draft={drafts[draftKey(sheet)] ?? null}
            onDraftChange={(draft) =>
              setDrafts((kept) => ({ ...kept, [draftKey(sheet)]: draft }))
            }
            onBackToPlaces={
              sheet.fromPlaces
                ? () => onSheetChange({ step: "places" })
                : undefined
            }
            onSaved={() => {
              onSaved(sheet.place)
              onOpenChange(false)
            }}
          />
        )}
      </DrawerContent>
    </Drawer>
  )
}

function draftKey(sheet: Sheet & { step: "record" }): string {
  return `${sheet.place.id}/${sheet.slot}`
}

function AddPlaceStep({ onPick }: { onPick: (place: PlaceRow) => void }) {
  const { value: run } = useRun()
  const map = useLoadedMap()
  const [view, setView] = useState<PlaceView>("remaining")
  const [query, setQuery] = useState("")
  const journey = viewerJourney(run)
  const places = map ? placesOf(map, journey.gameId) : []
  const total = map ? progressTotal(map) : 0
  const { remaining } = progressOf(listedPlaces(places, run), run, total)
  const groups = placeChoices(places, run, view, query)

  return (
    <>
      <DrawerHeaderRow
        title="Add a location"
        description="Where did you meet it?"
      />
      <div className="flex flex-col gap-2 px-4 pt-3 pb-1">
        <Input
          type="search"
          aria-label="Search locations"
          placeholder={`Search ${places.length} locations`}
          autoComplete="off"
          className="h-11 text-base"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <ToggleGroup
          aria-label="Show locations"
          variant="outline"
          spacing={0}
          className="w-full"
          value={[view]}
          onValueChange={([next]) => {
            // Pressing the pressed item empties the group; keep the view.
            if (next) setView(next as PlaceView)
          }}
        >
          <ToggleGroupItem value="remaining" className="h-11 flex-1">
            Remaining{" "}
            <span className="font-normal text-muted-foreground">
              {remaining}
            </span>
          </ToggleGroupItem>
          <ToggleGroupItem value="all" className="h-11 flex-1">
            All{" "}
            <span className="font-normal text-muted-foreground">
              {places.length}
            </span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {map && groups.length > 0 ? (
          groups.map((group) => (
            <PlaceGroup
              key={group.title}
              map={map}
              group={group}
              encounters={journey.encounters}
              onPick={onPick}
            />
          ))
        ) : (
          <p className="pt-4 text-sm text-muted-foreground">
            No location matches “{query.trim()}”.
          </p>
        )}
      </div>
    </>
  )
}

type PlaceGroupProps = {
  map: LoadedMap
  group: PlaceChoiceGroup
  /** The viewer's Encounters, shown under the locations they are at. */
  encounters: EncounterState[]
  onPick: (place: PlaceRow) => void
}

function PlaceGroup({ map, group, encounters, onPick }: PlaceGroupProps) {
  return (
    <section aria-label={group.title} className="flex flex-col gap-1 pt-3">
      <div className="flex items-baseline gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          {group.title}
        </h3>
        <span className="text-xs text-muted-foreground">{group.note}</span>
      </div>
      <ItemGroup className="gap-0">
        {group.places.map((place) => (
          <div key={place.id} role="listitem">
            <PlaceChoice
              map={map}
              place={place}
              encounters={encounters.filter(
                (encounter) => encounter.placeId === place.id
              )}
              onPick={onPick}
            />
          </div>
        ))}
      </ItemGroup>
    </section>
  )
}

type PlaceChoiceProps = {
  map: LoadedMap
  place: PlaceRow
  /** The viewer's Encounters at the location. */
  encounters: EncounterState[]
  onPick: (place: PlaceRow) => void
}

function PlaceChoice({ map, place, encounters, onPick }: PlaceChoiceProps) {
  const met = encounters.map((encounter) => encounter.met)
  const metNames = met.map((ref) =>
    ref ? (getSpecies(map, ref.species)?.name ?? "Unknown Pokémon") : "Unknown"
  )

  return (
    <Item
      size="xs"
      render={
        <button
          type="button"
          className="min-h-11 text-left hover:bg-muted"
          onClick={() => onPick(place)}
        />
      }
    >
      <ItemContent className="min-w-0">
        <ItemTitle>{place.name}</ItemTitle>
        {metNames.length > 0 ? (
          <ItemDescription className="truncate">
            {metNames.join(", ")}
          </ItemDescription>
        ) : null}
      </ItemContent>
      <ItemActions className="text-muted-foreground">
        {/* The description already names the Species. */}
        <span aria-hidden className="flex">
          {met
            .slice(0, 2)
            .map((ref, index) =>
              ref ? (
                <Sprite
                  key={index}
                  map={map}
                  species={ref.species}
                  form={ref.form}
                  size={28}
                />
              ) : (
                <UnknownSprite key={index} size={28} />
              )
            )}
        </span>
        <CaretRightIcon aria-hidden />
      </ItemActions>
    </Item>
  )
}
