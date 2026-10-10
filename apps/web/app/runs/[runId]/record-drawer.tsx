"use client"

import { CaretLeftIcon, MagnifyingGlassIcon } from "@phosphor-icons/react"
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import { Input } from "@workspace/ui/components/input"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemTitle,
} from "@workspace/ui/components/item"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import type { MutationErrorOf } from "headcanon"
import { useId, useState } from "react"
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
  const partyFull = partyOf(journey).length >= PARTY_SIZE
  const [draft, setDraft] = useState<Draft | null>(null)
  const [refusal, setRefusal] = useState<RecordRefusal | null>(null)

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
      origin: choice?.origin ?? "wild",
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
        {!map ? null : draft ? (
          <DetailsStep
            map={map}
            placeName={placeName}
            draft={draft}
            partyFull={partyFull}
            refusal={refusal}
            onChange={setDraft}
            onChangeSpecies={() => setDraft(null)}
            onSave={save}
          />
        ) : (
          <SpeciesStep
            map={map}
            placeId={placeId}
            placeName={placeName}
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

type SpeciesStepProps = {
  map: LoadedMap
  placeId: PlaceId
  placeName: string
  gameId: string
  onPick: (choice: SpeciesChoice | null) => void
}

function SpeciesStep({
  map,
  placeId,
  placeName,
  gameId,
  onPick,
}: SpeciesStepProps) {
  const [query, setQuery] = useState("")
  const searching = query.trim() !== ""

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>{placeName}</DrawerTitle>
        <DrawerDescription>Which species did you meet?</DrawerDescription>
      </DrawerHeader>
      <div className="px-4 pb-2">
        <InputGroup className="h-11">
          <InputGroupAddon>
            <MagnifyingGlassIcon aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            aria-label="Search species"
            placeholder={`Search all ${map.data.species.length} species`}
            className="text-base"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </InputGroup>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {searching ? (
          <ChoiceList
            map={map}
            choices={searchChoices(map, placeId, gameId, query)}
            onPick={onPick}
          />
        ) : (
          speciesGroups(map, placeId, gameId).map((group) => (
            <section key={group.name} aria-label={group.name}>
              <h3 className="px-1 pt-3 pb-1 text-sm font-medium">
                {group.name}
              </h3>
              <ChoiceList map={map} choices={group.choices} onPick={onPick} />
            </section>
          ))
        )}
        <Item
          size="sm"
          className="mt-2"
          render={
            <button
              type="button"
              className="min-h-11 text-left"
              onClick={() => onPick(null)}
            />
          }
        >
          <UnknownSprite size={36} />
          <ItemContent>
            <ItemTitle>Species unknown</ItemTitle>
          </ItemContent>
        </Item>
      </div>
    </>
  )
}

type ChoiceListProps = {
  map: LoadedMap
  choices: SpeciesChoice[]
  onPick: (choice: SpeciesChoice) => void
}

function ChoiceList({ map, choices, onPick }: ChoiceListProps) {
  return (
    <ItemGroup className="gap-0">
      {choices.map((choice) => (
        <Item
          key={`${choice.met.species}/${choice.met.form}`}
          size="sm"
          render={
            <button
              type="button"
              className="min-h-11 text-left"
              onClick={() => onPick(choice)}
            />
          }
        >
          <Sprite
            map={map}
            species={choice.met.species}
            form={choice.met.form}
            size={36}
          />
          <ItemContent>
            <ItemTitle>{choice.name}</ItemTitle>
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  )
}

type DetailsStepProps = {
  map: LoadedMap
  placeName: string
  draft: Draft
  partyFull: boolean
  refusal: RecordRefusal | null
  onChange: (draft: Draft) => void
  onChangeSpecies: () => void
  onSave: (draft: Draft) => void
}

function DetailsStep({
  map,
  placeName,
  draft,
  partyFull,
  refusal,
  onChange,
  onChangeSpecies,
  onSave,
}: DetailsStepProps) {
  const id = useId()
  const species = draft.met ? getSpecies(map, draft.met.species) : undefined
  const caught = draft.outcome === "caught"
  const nicknameProblem = nicknameRefusal(draft.nickname.trim())
  const goesTo = partyFull ? "box" : draft.goesTo

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>{placeName}</DrawerTitle>
        <DrawerDescription>Fill in the details.</DrawerDescription>
      </DrawerHeader>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4">
        <Item variant="muted" size="sm">
          {draft.met ? (
            <Sprite
              map={map}
              species={draft.met.species}
              form={draft.met.form}
              size={36}
            />
          ) : (
            <UnknownSprite size={36} />
          )}
          <ItemContent>
            <ItemTitle>{species?.name ?? "Unknown"}</ItemTitle>
          </ItemContent>
          <ItemActions>
            <Button
              type="button"
              variant="ghost"
              className="h-11 text-primary"
              onClick={onChangeSpecies}
            >
              <CaretLeftIcon aria-hidden />
              Change
            </Button>
          </ItemActions>
        </Item>

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
                  : undefined
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
