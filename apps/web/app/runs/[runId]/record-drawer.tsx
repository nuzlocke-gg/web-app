"use client"

import { CaretLeftIcon, XIcon } from "@phosphor-icons/react"
import {
  getSpecies,
  hasFormChoice,
  ORIGINS,
  type FormRef,
  type LoadedMap,
  type Origin,
  type PlaceId,
} from "@workspace/game-data"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@workspace/ui/components/drawer"
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
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@workspace/ui/components/item"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import type { MutationErrorOf } from "headcanon"
import { useId, useState, type ReactNode } from "react"
import { v7 as uuidv7 } from "uuid"

import { Sprite, UnknownSprite } from "@/components/sprite"
import type { RecordEncounterArgs } from "@/lib/runs/changes/record-encounter"
import { recordEncounter } from "@/lib/runs/mutations"
import { nicknameRefusal, nicknameRefusalMessages } from "@/lib/runs/nickname"
import {
  partyOf,
  PARTY_SIZE,
  viewerJourney,
  type EncounterOutcome,
} from "@/lib/runs/state"

import { useRun } from "./run-root"
import {
  searchChoices,
  speciesGroups,
  type SpeciesChoice,
  type SuggestedGroup,
} from "./species-choices"
import { useLoadedMap } from "./use-map"

type RecordDrawerProps = {
  placeId: PlaceId
  placeName: string
  /** The Slot the Encounter goes in. */
  slot: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Destination = "party" | "box"

type RecordRefusal = MutationErrorOf<typeof recordEncounter>

/** What the player has chosen in the Drawer so far. */
type Draft = {
  /** Null for "Species unknown". */
  met: FormRef | null
  /** The method group the Species was picked from, if any. */
  group: SuggestedGroup | null
  origin: Origin
  outcome: EncounterOutcome
  nickname: string
  goesTo: Destination
}

const originNames: Record<Origin, string> = {
  wild: "Wild",
  gift: "Gift",
  trade: "Trade",
}

const refusalMessages: Record<RecordRefusal["kind"], string> = {
  "run-not-active": "This run is not active, so nothing can be recorded.",
  "slot-taken": "You already have an encounter in this slot.",
  "unknown-entry": "Your game does not have this species or location.",
}

/**
 * The record Drawer: step 1 picks a Species (or "Species unknown"), step 2
 * fills in the details, and "Save encounter" records it at once, predicted.
 */
export function RecordDrawer({
  placeId,
  placeName,
  slot,
  open,
  onOpenChange,
}: RecordDrawerProps) {
  const { value: run, mutate } = useRun()
  const map = useLoadedMap()
  const journey = viewerJourney(run)
  const partyCount = partyOf(journey).length
  const partyFull = partyCount >= PARTY_SIZE
  const [draft, setDraft] = useState<Draft | null>(null)
  const [refusal, setRefusal] = useState<RecordRefusal | null>(null)
  const where = slot > 1 ? `${placeName} · slot ${slot}` : placeName

  function changeOpen(next: boolean) {
    if (next) {
      setDraft(null)
      setRefusal(null)
    }

    onOpenChange(next)
  }

  function pick(choice: SpeciesChoice | null) {
    setRefusal(null)
    setDraft({
      met: choice?.met ?? null,
      group: choice?.group ?? null,
      origin: choice?.group?.origin ?? "wild",
      outcome: choice ? "caught" : "failed",
      nickname: draft?.nickname ?? "",
      goesTo: partyFull ? "box" : "party",
    })
  }

  function save(details: Draft) {
    const result = mutate(
      recordEncounter({
        runId: run.id,
        encounterId: uuidv7(),
        placeId,
        slot,
        origin: details.origin,
        enteredAt: Date.now(),
        outcome: outcomeArgs(details, uuidv7(), partyFull),
      })
    )

    if (!result.ok) {
      setRefusal(result.error)

      return
    }

    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={changeOpen} showSwipeHandle>
      <DrawerContent>
        <RecordHeader
          description={where}
          onBack={draft ? () => setDraft(null) : undefined}
        />
        {!map ? null : draft ? (
          <DetailsStep
            map={map}
            placeName={placeName}
            draft={draft}
            partyCount={partyCount}
            refusal={refusal}
            onChange={setDraft}
            onChangeSpecies={() => setDraft(null)}
            onSave={save}
          />
        ) : (
          <SpeciesStep
            map={map}
            placeId={placeId}
            gameId={journey.gameId}
            onPick={pick}
          />
        )}
      </DrawerContent>
    </Drawer>
  )
}

/** The outcome arguments of a draft, with no key for an absent value. */
function outcomeArgs(
  draft: Draft,
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

type RecordHeaderProps = {
  description: string
  /** Shown as "Back to species" when given. */
  onBack?: () => void
}

function RecordHeader({ description, onBack }: RecordHeaderProps) {
  return (
    <div className="flex items-start gap-1 px-2">
      <div className="w-11 shrink-0 pt-2">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label="Back to species"
            onClick={onBack}
          >
            <CaretLeftIcon />
          </Button>
        ) : null}
      </div>
      <DrawerHeader className="flex-1 px-0">
        <DrawerTitle>Record an encounter</DrawerTitle>
        <DrawerDescription>{description}</DrawerDescription>
      </DrawerHeader>
      <div className="w-11 shrink-0 pt-2">
        <DrawerClose
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label="Close"
            />
          }
        >
          <XIcon />
        </DrawerClose>
      </div>
    </div>
  )
}

type SpeciesStepProps = {
  map: LoadedMap
  placeId: PlaceId
  gameId: string
  onPick: (choice: SpeciesChoice | null) => void
}

function SpeciesStep({ map, placeId, gameId, onPick }: SpeciesStepProps) {
  const [query, setQuery] = useState("")
  const searching = query.trim() !== ""

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
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {searching ? (
          <SpeciesSection title="Results">
            <ChoiceGrid
              map={map}
              choices={searchChoices(map, placeId, gameId, query)}
              onPick={onPick}
            />
          </SpeciesSection>
        ) : (
          speciesGroups(map, placeId, gameId).map((group) => (
            <SpeciesSection key={group.name} title={group.name}>
              <ChoiceGrid map={map} choices={group.choices} onPick={onPick} />
            </SpeciesSection>
          ))
        )}
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
      </div>
    </>
  )
}

function SpeciesSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-1.5 pt-3">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

type ChoiceGridProps = {
  map: LoadedMap
  choices: SpeciesChoice[]
  onPick: (choice: SpeciesChoice) => void
}

function ChoiceGrid({ map, choices, onPick }: ChoiceGridProps) {
  return (
    <ItemGroup className="grid grid-cols-2 gap-1.5">
      {choices.map((choice) => (
        <div key={`${choice.met.species}/${choice.met.form}`} role="listitem">
          <Item
            variant="muted"
            size="xs"
            render={
              <button
                type="button"
                className="min-h-11 text-left"
                onClick={() => onPick(choice)}
              />
            }
          >
            <ItemMedia>
              <Sprite
                map={map}
                species={choice.met.species}
                form={choice.met.form}
                size={32}
              />
            </ItemMedia>
            <ItemContent className="min-w-0">
              <ItemTitle>{choice.name}</ItemTitle>
            </ItemContent>
          </Item>
        </div>
      ))}
    </ItemGroup>
  )
}

type DetailsStepProps = {
  map: LoadedMap
  placeName: string
  draft: Draft
  partyCount: number
  refusal: RecordRefusal | null
  onChange: (draft: Draft) => void
  onChangeSpecies: () => void
  onSave: (draft: Draft) => void
}

function DetailsStep({
  map,
  placeName,
  draft,
  partyCount,
  refusal,
  onChange,
  onChangeSpecies,
  onSave,
}: DetailsStepProps) {
  const id = useId()
  const species = draft.met ? getSpecies(map, draft.met.species) : undefined
  const caught = draft.outcome === "caught"
  const partyFull = partyCount >= PARTY_SIZE
  const goesTo = partyFull ? "box" : draft.goesTo
  const nicknameProblem = nicknameRefusal(draft.nickname.trim())

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pt-3 pb-4">
        <Field>
          <FieldTitle>Species</FieldTitle>
          <Item variant="muted" size="xs">
            <ItemMedia>
              {draft.met ? (
                <Sprite
                  map={map}
                  species={draft.met.species}
                  form={draft.met.form}
                  size={32}
                />
              ) : (
                <UnknownSprite size={32} />
              )}
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{species?.name ?? "Unknown"}</ItemTitle>
              {draft.met ? (
                <ItemDescription>
                  {pickedFrom(draft.group, placeName)}
                </ItemDescription>
              ) : null}
            </ItemContent>
            <ItemActions>
              <Button
                type="button"
                variant="ghost"
                className="h-11"
                onClick={onChangeSpecies}
              >
                Change
              </Button>
            </ItemActions>
          </Item>
        </Field>

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

        <Choice
          id={`${id}-origin`}
          title="Origin"
          value={draft.origin}
          options={ORIGINS.map((origin) => ({
            value: origin,
            label: originNames[origin],
          }))}
          description={originHelp(draft.group)}
          onChange={(origin) => onChange({ ...draft, origin })}
        />

        {species && draft.met && hasFormChoice(map, species.id) ? (
          <Choice
            id={`${id}-form`}
            title="Form"
            value={draft.met.form}
            vertical={species.forms.length > 3}
            options={species.forms.map((form) => ({
              value: form.id,
              label: form.name,
            }))}
            onChange={(form) =>
              onChange({ ...draft, met: { species: species.id, form } })
            }
          />
        ) : null}

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

        {refusal ? (
          <Alert variant="destructive">
            <AlertDescription>{refusalMessages[refusal.kind]}</AlertDescription>
          </Alert>
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
  value: Value
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
        value={[value]}
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
