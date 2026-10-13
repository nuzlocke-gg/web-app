"use client"

import { CaretRightIcon } from "@phosphor-icons/react"
import { progressTotal, type LoadedMap } from "@workspace/game-data"
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
import { v7 as uuidv7 } from "uuid"

import { speciesName } from "@/components/species-name"
import { Sprite, UnknownSprite } from "@/components/sprite"
import { nextSlot } from "@/lib/runs/changes/record-encounter"
import { customPlaceNameFits } from "@/lib/runs/custom-place-name"
import { addCustomPlace } from "@/lib/runs/mutations"
import { placeKey, samePlace } from "@/lib/runs/place"
import {
  viewerJourney,
  type EncounterState,
  type RunState,
} from "@/lib/runs/state"

import {
  AddCustomPlaceField,
  AddFromSearch,
  CustomPlaceMenu,
  RenameCustomPlaceStep,
} from "./custom-places"
import { DrawerHeaderRow } from "./drawer-header-row"
import {
  listedPlaces,
  locationNameTaken,
  locationsOf,
  placeChoices,
  progressOf,
  type LocationRow,
  type PlaceChoiceGroup,
  type PlaceView,
} from "./encounter-list"
import { RecordSteps, type RecordDraft } from "./record-steps"
import { useRun, useRunChange } from "./run-root"
import { useLoadedMap } from "./use-map"

/**
 * What the Encounter Drawer shows: the list of locations, the record steps,
 * or the rename of a Custom location.
 */
export type Sheet =
  | { step: "places" }
  | { step: "rename"; location: LocationRow }
  | {
      step: "record"
      place: LocationRow
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
  place: LocationRow,
  fromPlaces: boolean
): Sheet {
  return {
    step: "record",
    place,
    slot: nextSlot(run, place.place),
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
  /** Called when a Custom location is added; its record steps then open. */
  onAdded: (location: LocationRow) => void
  /** Called when an Encounter is sent at a location; the Drawer then closes. */
  onSaved: (place: LocationRow) => void
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
  onAdded,
  onSaved,
  onClosed,
}: EncounterDrawerProps) {
  const { value: run } = useRun()
  const change = useRunChange()
  const map = useLoadedMap()
  const [drafts, setDrafts] = useState<KeptDrafts>({})
  const locations = map ? locationsOf(map, run, viewerJourney(run).gameId) : []

  // The id is chosen once, here, so a retry of the change keeps it.
  function addCustom(name: string) {
    const customPlaceId = uuidv7()
    const location: LocationRow = {
      place: { kind: "custom", id: customPlaceId },
      kind: "custom",
      name,
    }

    change(
      addCustomPlace({ runId: run.id, customPlaceId, name }),
      "Custom location"
    )
    onAdded(location)
    onSheetChange(recordSheet(run, location, true))
  }

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
            locations={locations}
            onPick={(place) => onSheetChange(recordSheet(run, place, true))}
            onAdd={addCustom}
            onRename={(location) => onSheetChange({ step: "rename", location })}
          />
        ) : sheet.step === "rename" ? (
          <RenameCustomPlaceStep
            location={sheet.location}
            open={open}
            onBack={() => onSheetChange({ step: "places" })}
          />
        ) : (
          <RecordSteps
            key={draftKey(sheet)}
            place={sheet.place.place}
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
  return `${placeKey(sheet.place.place)}/${sheet.slot}`
}

type AddPlaceStepProps = {
  locations: LocationRow[]
  onPick: (place: LocationRow) => void
  /** Adds a Custom location with this trimmed name. */
  onAdd: (name: string) => void
  onRename: (location: LocationRow) => void
}

function AddPlaceStep({
  locations,
  onPick,
  onAdd,
  onRename,
}: AddPlaceStepProps) {
  const { value: run } = useRun()
  const map = useLoadedMap()
  const [view, setView] = useState<PlaceView>("remaining")
  const [query, setQuery] = useState("")
  const journey = viewerJourney(run)
  const total = map ? progressTotal(map) : 0
  const { remaining } = progressOf(listedPlaces(locations, run), run, total)
  const groups = placeChoices(locations, run, view, query)
  const searched = query.trim()
  // A search for a name no location has offers to add it.
  const offer =
    searched !== "" &&
    customPlaceNameFits(searched) &&
    !locationNameTaken(map, run, searched)

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
          placeholder={`Search ${locations.length} locations`}
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
              {locations.length}
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
              onRename={onRename}
            />
          ))
        ) : (
          <p className="pt-4 text-sm text-muted-foreground">
            No location matches “{searched}”.
          </p>
        )}
        {offer ? <AddFromSearch name={searched} onAdd={onAdd} /> : null}
        {searched === "" ? <AddCustomPlaceField onAdd={onAdd} /> : null}
      </div>
    </>
  )
}

type PlaceGroupProps = {
  map: LoadedMap
  group: PlaceChoiceGroup
  /** The viewer's Encounters, shown under the locations they are at. */
  encounters: EncounterState[]
  onPick: (place: LocationRow) => void
  onRename: (location: LocationRow) => void
}

function PlaceGroup({
  map,
  group,
  encounters,
  onPick,
  onRename,
}: PlaceGroupProps) {
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
          <div
            key={placeKey(place.place)}
            role="listitem"
            className="flex items-center gap-1"
          >
            <PlaceChoice
              map={map}
              place={place}
              encounters={encounters.filter((encounter) =>
                samePlace(encounter.place, place.place)
              )}
              onPick={onPick}
            />
            {place.kind === "custom" ? (
              <CustomPlaceMenu
                location={place}
                onRename={() => onRename(place)}
              />
            ) : null}
          </div>
        ))}
      </ItemGroup>
    </section>
  )
}

type PlaceChoiceProps = {
  map: LoadedMap
  place: LocationRow
  /** The viewer's Encounters at the location. */
  encounters: EncounterState[]
  onPick: (place: LocationRow) => void
}

function PlaceChoice({ map, place, encounters, onPick }: PlaceChoiceProps) {
  const met = encounters.map((encounter) => encounter.met)
  const metNames = met.map((ref) =>
    ref ? speciesName(map, ref.species) : "Unknown"
  )

  return (
    <Item
      size="xs"
      render={
        <button
          type="button"
          className="min-h-11 min-w-0 flex-1 text-left hover:bg-muted"
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
