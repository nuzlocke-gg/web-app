"use client"

import {
  getSpecies,
  hasFormChoice,
  ORIGINS,
  searchSpecies,
  suggestions,
  type FormRef,
  type LoadedMap,
  type Origin,
  type PlaceId,
} from "@workspace/game-data"
import { Button } from "@workspace/ui/components/button"
import { DrawerFooter } from "@workspace/ui/components/drawer"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@workspace/ui/components/item"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { useId, useState, type ReactNode } from "react"
import { v7 as uuidv7 } from "uuid"

import { Sprite, UnknownSprite } from "@/components/sprite"
import { useLeavePrompt } from "@/components/use-leave-prompt"
import { WarningAlert } from "@/components/warning-alert"
import type { RecordEncounterArgs } from "@/lib/runs/changes/record-encounter"
import { recordEncounter } from "@/lib/runs/mutations"
import { nicknameRefusal, nicknameRefusalMessages } from "@/lib/runs/nickname"
import { ruleName } from "@/lib/runs/rules"
import { firstCatchInLine } from "@/lib/runs/rule-checks"
import {
  partyOf,
  PARTY_SIZE,
  viewerJourney,
  type EncounterOutcome,
} from "@/lib/runs/state"
import { checksRule, gameFactsOf, warningsOfRecord } from "@/lib/runs/warnings"

import { DrawerHeaderRow, type Back } from "./drawer-header-row"
import { useRun, useRunChange } from "./run-root"
import { ChoiceGrid, SpeciesSection, type SpeciesNote } from "./species-grid"
import {
  searchChoices,
  speciesGroups,
  type SpeciesChoice,
  type SuggestedGroup,
} from "./species-choices"
import { useLoadedMap } from "./use-map"
import { encounterLabel, warningText, type WarningText } from "./warning-text"

type RecordStepsProps = {
  placeId: PlaceId
  placeName: string
  /** The Slot the Encounter goes in. */
  slot: number
  /** Whether the Drawer that holds the steps is open. */
  open: boolean
  /** The choices so far; null on step 1. */
  draft: RecordDraft | null
  onDraftChange: (draft: RecordDraft | null) => void
  /** Shown on step 1 as "Back to locations" when given. */
  onBackToPlaces?: () => void
  /** Called after "Save encounter" sends the Encounter; close the Drawer then. */
  onSaved: () => void
}

type Destination = "party" | "box"

/** What the player has chosen in the record Drawer so far. */
export type RecordDraft = {
  /** Null for "Species unknown". */
  met: FormRef | null
  /** The method group the Species was picked from, if any. */
  group: SuggestedGroup | null
  origin: Origin
  outcome: EncounterOutcome
  nickname: string
  goesTo: Destination
}

/** The name of each origin, as the screens show it. */
export const originNames: Record<Origin, string> = {
  wild: "Wild",
  gift: "Gift",
  trade: "Trade",
}

/**
 * The content of the record Drawer: step 1 picks a Species (or "Species
 * unknown"), step 2 fills in the details, and "Save encounter" records it at
 * once, predicted. Render it inside a `DrawerContent`; the caller keeps the
 * draft, so it outlives the Drawer's content.
 */
export function RecordSteps({
  placeId,
  placeName,
  slot,
  open,
  draft,
  onDraftChange: setDraft,
  onBackToPlaces,
  onSaved,
}: RecordStepsProps) {
  const { value: run } = useRun()
  const change = useRunChange()
  const map = useLoadedMap()
  const journey = viewerJourney(run)
  const partyCount = partyOf(journey).length
  const partyFull = partyCount >= PARTY_SIZE
  const where = slot > 1 ? `${placeName} · slot ${slot}` : placeName

  // The preview of the Warnings reuses one set of ids and one time of entry,
  // so its Alerts keep their identity while the player types; a save takes
  // new ones.
  const [preview] = useState(() => ({
    ids: newRecordIds(),
    enteredAt: Date.now(),
    mutationId: uuidv7(),
  }))

  // Choices made in the details step are lost if the page unloads.
  useLeavePrompt(open && draft !== null)

  function argsOf(
    details: RecordDraft,
    ids: RecordIds,
    enteredAt: number
  ): RecordEncounterArgs {
    return {
      runId: run.id,
      encounterId: ids.encounterId,
      placeId,
      slot,
      origin: details.origin,
      enteredAt,
      outcome: outcomeArgs(details, ids.pokemonId, partyFull),
    }
  }

  function warningsOfSave(details: RecordDraft): WarningText[] {
    if (!map) return []

    const outcome = warningsOfRecord(
      run,
      gameFactsOf(map),
      argsOf(details, preview.ids, preview.enteredAt),
      preview.mutationId
    )

    return (
      outcome?.warnings.map((warning) =>
        warningText(map, outcome.run, warning, "record")
      ) ?? []
    )
  }

  function sameLineNote(choice: SpeciesChoice): SpeciesNote | undefined {
    if (!map) return undefined

    const earlier = firstCatchInLine(
      journey,
      choice.met.species,
      gameFactsOf(map)
    )

    return (
      earlier && {
        rule: ruleName("duplicate-clause"),
        text: `Same line as ${encounterLabel(map, journey, earlier)}`,
      }
    )
  }

  const placeTaken =
    checksRule(run, "first-encounter") &&
    journey.encounters.some((encounter) => encounter.placeId === placeId)

  function pick(choice: SpeciesChoice | null) {
    setDraft({
      met: choice?.met ?? null,
      group: choice?.group ?? null,
      origin: choice?.group?.origin ?? "wild",
      outcome: choice ? "caught" : "failed",
      nickname: draft?.nickname ?? "",
      goesTo: partyFull ? "box" : "party",
    })
  }

  function save(details: RecordDraft) {
    change(
      recordEncounter(argsOf(details, newRecordIds(), Date.now())),
      "Encounter"
    )

    // The Drawer closes either way: it would cover a refusal's toast, and
    // nothing in it can fix a refusal.
    onSaved()
  }

  const back: Back | undefined = draft
    ? { label: "Back to species", onClick: () => setDraft(null) }
    : onBackToPlaces && { label: "Back to locations", onClick: onBackToPlaces }

  return (
    <>
      <DrawerHeaderRow
        title="Record an encounter"
        description={where}
        back={back}
      />
      {!map ? null : draft ? (
        <DetailsStep
          map={map}
          placeName={placeName}
          draft={draft}
          warnings={warningsOfSave(draft)}
          partyCount={partyCount}
          onChange={setDraft}
          onChangeSpecies={() => setDraft(null)}
          onSave={save}
        />
      ) : (
        <SpeciesStep
          map={map}
          placeId={placeId}
          gameId={journey.gameId}
          alert={
            placeTaken ? (
              <WarningAlert
                rule={ruleName("first-encounter")}
                text={`You already have an encounter at ${placeName}. You can still record this one.`}
              />
            ) : undefined
          }
          noteOf={
            checksRule(run, "duplicate-clause") ? sameLineNote : undefined
          }
          onPick={pick}
        />
      )}
    </>
  )
}

/** The ids a save of Record an Encounter gives its Encounter and Pokémon. */
type RecordIds = { encounterId: string; pokemonId: string }

function newRecordIds(): RecordIds {
  return { encounterId: uuidv7(), pokemonId: uuidv7() }
}

/** The outcome arguments of a draft, with no key for an absent value. */
function outcomeArgs(
  draft: RecordDraft,
  pokemonId: string,
  partyFull: boolean
): RecordEncounterArgs["outcome"] {
  if (draft.outcome === "failed" || !draft.met) {
    return draft.met ? { kind: "failed", met: draft.met } : { kind: "failed" }
  }

  const nickname = draft.nickname.trim()

  return {
    kind: "caught",
    met: draft.met,
    pokemonId,
    goesTo: partyFull ? "box" : draft.goesTo,
    ...(nickname ? { nickname } : {}),
  }
}

type SpeciesStepProps = {
  map: LoadedMap
  placeId: PlaceId
  gameId: string
  /** Whether the list ends with "Species unknown", which picks null. */
  allowUnknown?: boolean
  /** Shown under the search, such as a Warning about the location. */
  alert?: ReactNode
  /** A Warning under a Species, such as "Same line as Fang". */
  noteOf?: (choice: SpeciesChoice) => SpeciesNote | undefined
  onPick: (choice: SpeciesChoice | null) => void
}

/**
 * Step 1 of the record Drawer: the location's Species by method group, every
 * other Species, and a search over all of them.
 */
export function SpeciesStep({
  map,
  placeId,
  gameId,
  allowUnknown = true,
  alert,
  noteOf,
  onPick,
}: SpeciesStepProps) {
  const [query, setQuery] = useState("")
  const searching = query.trim() !== ""
  const suggested = suggestions(map, placeId, gameId)

  return (
    <>
      <div className="px-4 pt-3 pb-1">
        <Input
          type="search"
          aria-label="Search species"
          placeholder={`Search all ${map.data.species.length} species`}
          autoComplete="off"
          className="h-11 text-base"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {alert ? <div className="pt-2">{alert}</div> : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {searching ? (
          <SpeciesSection title="Results">
            <ChoiceGrid
              map={map}
              choices={searchChoices(suggested, searchSpecies(map, query))}
              noteOf={noteOf}
              onPick={onPick}
            />
          </SpeciesSection>
        ) : (
          speciesGroups(suggested, map.data.species).map((group) => (
            <SpeciesSection key={group.name} title={group.name}>
              <ChoiceGrid
                map={map}
                choices={group.choices}
                noteOf={noteOf}
                onPick={onPick}
              />
            </SpeciesSection>
          ))
        )}
        {allowUnknown ? (
          <Item
            variant="muted"
            size="xs"
            className="mt-4"
            render={
              <button
                type="button"
                className="min-h-11 text-left"
                onClick={() => onPick(null)}
              />
            }
          >
            <ItemMedia>
              <UnknownSprite size={32} />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Species unknown</ItemTitle>
            </ItemContent>
          </Item>
        ) : null}
      </div>
    </>
  )
}

type DetailsStepProps = {
  map: LoadedMap
  placeName: string
  draft: RecordDraft
  /** The Warnings the save will cause; they never block it. */
  warnings: WarningText[]
  partyCount: number
  onChange: (draft: RecordDraft) => void
  onChangeSpecies: () => void
  onSave: (draft: RecordDraft) => void
}

function DetailsStep({
  map,
  placeName,
  draft,
  warnings,
  partyCount,
  onChange,
  onChangeSpecies,
  onSave,
}: DetailsStepProps) {
  const id = useId()
  const caught = draft.outcome === "caught"
  const partyFull = partyCount >= PARTY_SIZE
  const goesTo = partyFull ? "box" : draft.goesTo
  const nicknameProblem = nicknameRefusal(draft.nickname.trim())

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pt-3 pb-4">
        <SpeciesField
          map={map}
          title="Species"
          met={draft.met}
          description={
            draft.met ? pickedFrom(draft.group, placeName) : undefined
          }
          onChange={onChangeSpecies}
        />

        <Choice
          id={`${id}-outcome`}
          title="Outcome"
          value={draft.outcome}
          options={[
            { value: "caught", label: "Caught", disabled: !draft.met },
            { value: "failed", label: "Failed" },
          ]}
          onChange={(outcome) => onChange({ ...draft, outcome })}
        />

        <OriginChoice
          id={`${id}-origin`}
          value={draft.origin}
          description={originHelp(draft.group)}
          onChange={(origin) => onChange({ ...draft, origin })}
        />

        <FormChoice
          id={`${id}-form`}
          map={map}
          met={draft.met}
          onChange={(met) => onChange({ ...draft, met })}
        />

        {caught ? (
          <>
            <Field data-invalid={nicknameProblem !== null || undefined}>
              <FieldLabel htmlFor={`${id}-nickname`}>Nickname</FieldLabel>
              <Input
                id={`${id}-nickname`}
                className="h-11 text-base"
                placeholder="Nickname"
                autoComplete="off"
                value={draft.nickname}
                aria-invalid={nicknameProblem !== null || undefined}
                onChange={(event) =>
                  onChange({ ...draft, nickname: event.target.value })
                }
              />
              {nicknameProblem ? (
                <FieldError>
                  {nicknameRefusalMessages[nicknameProblem]}
                </FieldError>
              ) : null}
            </Field>

            <Choice
              id={`${id}-goes-to`}
              title="Goes to"
              value={goesTo}
              options={[
                { value: "party", label: "Party", disabled: partyFull },
                { value: "box", label: "Box" },
              ]}
              description={
                partyFull
                  ? `Your party is full (${PARTY_SIZE} of ${PARTY_SIZE}), so it goes to the box.`
                  : `Your party has ${partyCount} of ${PARTY_SIZE}.`
              }
              onChange={(next) => onChange({ ...draft, goesTo: next })}
            />
          </>
        ) : null}

        {warnings.length > 0 ? (
          <div className="flex flex-col gap-2">
            {warnings.map((warning) => (
              <WarningAlert
                key={warning.rule}
                rule={warning.rule}
                text={warning.text}
              />
            ))}
          </div>
        ) : null}
      </div>
      <DrawerFooter className="pt-3">
        <Button
          type="button"
          size="lg"
          className="h-11"
          disabled={nicknameProblem !== null}
          onClick={() => onSave(draft)}
        >
          Save encounter
        </Button>
      </DrawerFooter>
    </>
  )
}

type SpeciesFieldProps = {
  map: LoadedMap
  title: string
  /** Null shows "Unknown". */
  met: FormRef | null
  description?: string
  onChange: () => void
}

/** A chosen Species with its sprite and a Change button. */
export function SpeciesField({
  map,
  title,
  met,
  description,
  onChange,
}: SpeciesFieldProps) {
  const species = met ? getSpecies(map, met.species) : undefined

  return (
    <Field>
      <FieldTitle>{title}</FieldTitle>
      <Item variant="muted" size="xs">
        <ItemMedia>
          {met ? (
            <Sprite map={map} species={met.species} form={met.form} size={32} />
          ) : (
            <UnknownSprite size={32} />
          )}
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{species?.name ?? "Unknown"}</ItemTitle>
          {description ? (
            <ItemDescription>{description}</ItemDescription>
          ) : null}
        </ItemContent>
        <ItemActions>
          <Button
            type="button"
            variant="ghost"
            className="h-11"
            onClick={onChange}
          >
            Change
          </Button>
        </ItemActions>
      </Item>
    </Field>
  )
}

type OriginChoiceProps = {
  id: string
  /** Null presses nothing, for an origin this build does not know. */
  value: Origin | null
  description?: string
  onChange: (origin: Origin) => void
}

/** The Origin of an Encounter: Wild, Gift, or Trade. */
export function OriginChoice({
  id,
  value,
  description,
  onChange,
}: OriginChoiceProps) {
  return (
    <Choice
      id={id}
      title="Origin"
      value={value}
      options={ORIGINS.map((origin) => ({
        value: origin,
        label: originNames[origin],
      }))}
      description={description}
      onChange={onChange}
    />
  )
}

type FormChoiceProps = {
  id: string
  map: LoadedMap
  met: FormRef | null
  onChange: (met: FormRef) => void
}

/** The Form of the Species met; nothing when the Species has one Form. */
export function FormChoice({ id, map, met, onChange }: FormChoiceProps) {
  const species = met ? getSpecies(map, met.species) : undefined

  if (!met || !species || !hasFormChoice(map, species.id)) return null

  return (
    <Choice
      id={id}
      title="Form"
      value={met.form}
      vertical={species.forms.length > 3}
      options={species.forms.map((form) => ({
        value: form.id,
        label: form.name,
      }))}
      onChange={(form) => onChange({ species: species.id, form })}
    />
  )
}

/** Where step 1 found the Species, under its name in step 2. */
function pickedFrom(group: SuggestedGroup | null, placeName: string): string {
  return group
    ? `From the ${group.name.toLowerCase()} table`
    : `Not in the table of ${placeName}`
}

/** Why the Origin starts where it does. */
function originHelp(group: SuggestedGroup | null): string {
  return group
    ? `${originNames[group.origin]} is the default for the ${group.name.toLowerCase()} table.`
    : "Select how you got it."
}

type ChoiceProps<Value extends string> = {
  id: string
  title: string
  /** Null presses nothing. */
  value: Value | null
  options: { value: Value; label: string; disabled?: boolean }[]
  description?: string
  vertical?: boolean
  onChange: (value: Value) => void
}

/** One labelled joined ToggleGroup with exactly one value pressed. */
function Choice<Value extends string>({
  id,
  title,
  value,
  options,
  description,
  vertical = false,
  onChange,
}: ChoiceProps<Value>) {
  return (
    <Field>
      <FieldTitle id={id}>{title}</FieldTitle>
      <ToggleGroup
        aria-labelledby={id}
        variant="outline"
        spacing={0}
        orientation={vertical ? "vertical" : "horizontal"}
        className="w-full"
        value={value ? [value] : []}
        onValueChange={([next]) => {
          // Pressing the pressed item empties the group; keep the value.
          if (next) onChange(next as Value)
        }}
      >
        {options.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className="h-11 flex-1"
          >
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  )
}
