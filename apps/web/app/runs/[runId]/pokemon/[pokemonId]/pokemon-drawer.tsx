"use client"

import { SkullIcon } from "@phosphor-icons/react"
import {
  getGame,
  nextInLine,
  searchSpecies,
  type LoadedMap,
} from "@workspace/game-data"
import { Button } from "@workspace/ui/components/button"
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
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
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"
import { useId, useState } from "react"
import { v7 as uuidv7 } from "uuid"

import { speciesName } from "@/components/species-name"
import { Sprite } from "@/components/sprite"
import { useLeavePrompt } from "@/components/use-leave-prompt"
import {
  deathCauseRefusal,
  deathCauseRefusalMessages,
  typedDeathLevel,
} from "@/lib/runs/death"
import {
  changeForm,
  editDeath,
  evolvePokemon,
  movePokemon,
  recordDeath,
  renamePokemon,
} from "@/lib/runs/mutations"
import { nicknameRefusal, nicknameRefusalMessages } from "@/lib/runs/nickname"
import { partyOf, PARTY_SIZE, type ViewerPokemon } from "@/lib/runs/state"

import { DrawerHeaderRow } from "../../drawer-header-row"
import { FormChoice } from "../../record-steps"
import { useRun, useRunChange } from "../../run-root"
import { evolveGroups, type SpeciesChoice } from "../../species-choices"
import {
  RadioGrid,
  SpeciesSection,
  speciesChoiceValue,
} from "../../species-grid"

/** Which small Drawer of the Pokémon screen is open. */
export type PokemonSheet = "rename" | "evolve" | "form" | "swap" | "death"

type PokemonDrawerProps = {
  map: LoadedMap
  shown: ViewerPokemon
  /** Kept while the Drawer closes. */
  sheet: PokemonSheet
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The small Drawers of the Pokémon screen: Rename, Evolve (with "Other
 * species" to correct a wrong one), Change the Form, the swap into a full
 * Party, and the death Drawer (Record a death, or Edit a death when dead).
 */
export function PokemonDrawer({
  map,
  shown,
  sheet,
  open,
  onOpenChange,
}: PokemonDrawerProps) {
  const close = () => onOpenChange(false)
  const props = { map, shown, open, onClose: close }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        {sheet === "rename" ? <RenameStep {...props} /> : null}
        {sheet === "evolve" ? <EvolveStep {...props} /> : null}
        {sheet === "form" ? <FormStep {...props} /> : null}
        {sheet === "swap" ? <SwapStep {...props} /> : null}
        {sheet === "death" ? <DeathStep {...props} /> : null}
      </DrawerContent>
    </Drawer>
  )
}

type StepProps = {
  map: LoadedMap
  shown: ViewerPokemon
  open: boolean
  onClose: () => void
}

/** The name of a Pokémon on its screen: its nickname, else its Species. */
export function pokemonName(map: LoadedMap, shown: ViewerPokemon): string {
  return (
    shown.pokemon.nickname ?? speciesName(map, shown.pokemon.species.species)
  )
}

function RenameStep({ map, shown, open, onClose }: StepProps) {
  const { value: run } = useRun()
  const change = useRunChange()
  const id = useId()
  const { pokemon } = shown
  const [draft, setDraft] = useState(pokemon.nickname ?? "")
  const nickname = draft.trim()
  const problem = nicknameRefusal(nickname)

  useLeavePrompt(open && nickname !== (pokemon.nickname ?? ""))

  function save() {
    change(
      renamePokemon({
        runId: run.id,
        pokemonId: pokemon.id,
        nickname: nickname === "" ? null : nickname,
      }),
      "Rename"
    )
    onClose()
  }

  return (
    <>
      <DrawerHeaderRow
        title={`Rename ${pokemonName(map, shown)}`}
        description={speciesName(map, pokemon.species.species)}
      />
      <form
        className="flex flex-col"
        onSubmit={(event) => {
          event.preventDefault()
          if (!problem) save()
        }}
      >
        <div className="px-4 pt-3 pb-2">
          <Field data-invalid={problem !== null || undefined}>
            <FieldLabel htmlFor={`${id}-nickname`}>Nickname</FieldLabel>
            <Input
              id={`${id}-nickname`}
              className="h-11 text-base"
              placeholder="Nickname"
              autoComplete="off"
              value={draft}
              aria-invalid={problem !== null || undefined}
              onChange={(event) => setDraft(event.target.value)}
            />
            {problem ? (
              <FieldError>{nicknameRefusalMessages[problem]}</FieldError>
            ) : null}
          </Field>
        </div>
        <DrawerFooter className="pt-3">
          <Button
            type="submit"
            size="lg"
            className="h-11"
            disabled={problem !== null}
          >
            Save nickname
          </Button>
        </DrawerFooter>
      </form>
    </>
  )
}

function EvolveStep({ map, shown, open, onClose }: StepProps) {
  const { value: run } = useRun()
  const change = useRunChange()
  const { journey, pokemon } = shown
  const current = speciesName(map, pokemon.species.species)
  const [query, setQuery] = useState("")
  const [picked, setPicked] = useState<SpeciesChoice | null>(null)
  const next = nextInLine(map, pokemon.species.species, pokemon.species.form)
  const groups = evolveGroups(
    pokemon.species.species,
    next,
    map.data.species,
    query.trim() ? searchSpecies(map, query) : null
  )
  // A pick from the line is an evolution; any other Species corrects a wrong one.
  const evolves =
    picked !== null &&
    next.some((target) => target.species === picked.met.species)
  const gameName = getGame(map, journey.gameId)?.name ?? "this game"

  useLeavePrompt(open && picked !== null)

  function save() {
    if (!picked) return

    change(
      evolvePokemon({
        runId: run.id,
        pokemonId: pokemon.id,
        from: pokemon.species,
        species: picked.met,
        pick: evolves
          ? { kind: "next", lineId: uuidv7(), enteredAt: Date.now() }
          : { kind: "other" },
      }),
      evolves ? "Evolution" : "Species correction"
    )
    onClose()
  }

  return (
    <>
      <DrawerHeaderRow
        title={`Evolve ${pokemonName(map, shown)}`}
        description={`Now ${current}. Pick its new species.`}
      />
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
      <RadioGroup
        aria-label="New species"
        className="block min-h-0 flex-1 overflow-y-auto px-4 pb-4"
        value={picked ? speciesChoiceValue(picked.met) : null}
        onValueChange={(value) =>
          setPicked(
            [...groups.next, ...groups.others].find(
              (choice) => speciesChoiceValue(choice.met) === value
            ) ?? null
          )
        }
      >
        <SpeciesSection title="Next in its line">
          {groups.next.length > 0 ? (
            <RadioGrid map={map} choices={groups.next} />
          ) : (
            <p className="text-xs text-muted-foreground">
              {next.length > 0
                ? "No match in its line."
                : `${current} does not evolve further in ${gameName}.`}
            </p>
          )}
        </SpeciesSection>
        <SpeciesSection title="Other species">
          <p className="-mt-1 text-xs text-muted-foreground">
            To correct a wrong species
          </p>
          <RadioGrid map={map} choices={groups.others} />
        </SpeciesSection>
      </RadioGroup>
      <DrawerFooter className="pt-3">
        <Button
          type="button"
          size="lg"
          className="h-11"
          disabled={!picked}
          onClick={save}
        >
          {picked
            ? `${evolves ? "Evolve into" : "Change to"} ${picked.name}`
            : "Pick a species"}
        </Button>
      </DrawerFooter>
    </>
  )
}

function FormStep({ map, shown, open, onClose }: StepProps) {
  const { value: run } = useRun()
  const change = useRunChange()
  const id = useId()
  const { pokemon } = shown
  const [draft, setDraft] = useState(pokemon.species)

  useLeavePrompt(open && draft.form !== pokemon.species.form)

  function save() {
    change(
      changeForm({ runId: run.id, pokemonId: pokemon.id, form: draft.form }),
      "Form change"
    )
    onClose()
  }

  return (
    <>
      <DrawerHeaderRow
        title={`Change the form of ${pokemonName(map, shown)}`}
        description={speciesName(map, pokemon.species.species)}
      />
      <div className="px-4 pt-3 pb-2">
        <FormChoice
          id={`${id}-form`}
          map={map}
          met={draft}
          onChange={setDraft}
        />
      </div>
      <DrawerFooter className="pt-3">
        <Button type="button" size="lg" className="h-11" onClick={save}>
          Save form
        </Button>
      </DrawerFooter>
    </>
  )
}

function SwapStep({ map, shown, open, onClose }: StepProps) {
  const { value: run } = useRun()
  const change = useRunChange()
  const id = useId()
  const { journey, pokemon } = shown
  const party = partyOf(journey)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const picked = party.find((candidate) => candidate.id === pickedId)
  const name = pokemonName(map, shown)

  useLeavePrompt(open && picked !== undefined)

  function save() {
    if (!picked) return

    change(
      movePokemon({
        runId: run.id,
        moves: [
          { pokemonId: picked.id, to: "box" },
          { pokemonId: pokemon.id, to: "party" },
        ],
      }),
      "Party swap"
    )
    onClose()
  }

  return (
    <>
      <DrawerHeaderRow
        title="Your party is full"
        description={`Pick one to send to the box. ${name} takes its place.`}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-4 pt-3 pb-4">
        <FieldDescription id={`${id}-party`}>
          Your party, {party.length} of {PARTY_SIZE}
        </FieldDescription>
        <RadioGroup
          aria-labelledby={`${id}-party`}
          className="flex flex-col gap-1.5"
          value={pickedId}
          onValueChange={(value) => setPickedId(value as string)}
        >
          {party.map((member) => {
            const memberName = pokemonName(map, { journey, pokemon: member })
            const memberSpecies = speciesName(map, member.species.species)

            return (
              <FieldLabel key={member.id} htmlFor={`${id}-${member.id}`}>
                <Field
                  orientation="horizontal"
                  className="min-h-13 gap-3 py-1.5! pr-3! pl-1.5!"
                >
                  {/* The label names the radio; the sprite would name it twice. */}
                  <span aria-hidden className="contents">
                    <Sprite
                      map={map}
                      species={member.species.species}
                      form={member.species.form}
                      size={36}
                    />
                  </span>
                  <FieldTitle className="flex min-w-0 flex-1 flex-col items-start gap-0">
                    <span className="truncate">{memberName}</span>
                    {member.nickname ? (
                      <span className="text-xs font-normal text-muted-foreground">
                        {memberSpecies}
                      </span>
                    ) : null}
                  </FieldTitle>
                  <RadioGroupItem value={member.id} id={`${id}-${member.id}`} />
                </Field>
              </FieldLabel>
            )
          })}
        </RadioGroup>
      </div>
      <DrawerFooter className="pt-3">
        <Button
          type="button"
          size="lg"
          className="h-11"
          disabled={!picked}
          onClick={save}
        >
          {picked
            ? `Send ${pokemonName(map, { journey, pokemon: picked })} to the box`
            : "Pick one to send to the box"}
        </Button>
      </DrawerFooter>
    </>
  )
}

function DeathStep({ map, shown, open, onClose }: StepProps) {
  const { value: run } = useRun()
  const change = useRunChange()
  const id = useId()
  const { pokemon } = shown
  // A dead Pokémon's Drawer edits its death; a living one's records it.
  const editing = pokemon.diedAt !== null
  const savedLevel = pokemon.deathLevel?.toString() ?? ""
  const savedCause = pokemon.deathCause ?? ""
  const [levelDraft, setLevelDraft] = useState({
    value: savedLevel,
    badInput: false,
  })
  const [causeDraft, setCauseDraft] = useState(savedCause)
  const level = typedDeathLevel(
    { value: levelDraft.value.trim(), badInput: levelDraft.badInput },
    map.data.maxLevel
  )
  const cause = causeDraft.trim()
  const causeProblem = deathCauseRefusal(cause)
  const invalid = level.problem !== null || causeProblem !== null
  const name = pokemonName(map, shown)
  const species = speciesName(map, pokemon.species.species)

  useLeavePrompt(
    open &&
      (levelDraft.badInput ||
        levelDraft.value.trim() !== savedLevel ||
        cause !== savedCause)
  )

  function save() {
    const details = {
      runId: run.id,
      pokemonId: pokemon.id,
      level: level.level,
      cause: cause === "" ? null : cause,
    }

    if (editing) {
      change(editDeath(details), "Death edit")
    } else {
      change(recordDeath({ ...details, diedAt: Date.now() }), "Death")
    }
    onClose()
  }

  return (
    <>
      <DrawerHeaderRow
        title={editing ? `Edit the death of ${name}` : "Record a death"}
        description={pokemon.nickname ? `${name} · ${species}` : species}
      />
      <form
        className="flex flex-col"
        onSubmit={(event) => {
          event.preventDefault()
          if (!invalid) save()
        }}
      >
        <div className="flex flex-col gap-4 px-4 pt-3 pb-2">
          <Field data-invalid={level.problem !== null || undefined}>
            <FieldLabel htmlFor={`${id}-level`}>Level (optional)</FieldLabel>
            <Input
              id={`${id}-level`}
              className="h-11 text-base"
              type="number"
              inputMode="numeric"
              min={1}
              max={map.data.maxLevel}
              step={1}
              autoComplete="off"
              value={levelDraft.value}
              aria-invalid={level.problem !== null || undefined}
              onChange={(event) =>
                setLevelDraft({
                  value: event.target.value,
                  badInput: event.target.validity.badInput,
                })
              }
            />
            {level.problem ? <FieldError>{level.problem}</FieldError> : null}
          </Field>
          <Field data-invalid={causeProblem !== null || undefined}>
            <FieldLabel htmlFor={`${id}-cause`}>Cause (optional)</FieldLabel>
            <Input
              id={`${id}-cause`}
              className="h-11 text-base"
              placeholder="Such as Roxanne's Nosepass"
              autoComplete="off"
              value={causeDraft}
              aria-invalid={causeProblem !== null || undefined}
              onChange={(event) => setCauseDraft(event.target.value)}
            />
            {causeProblem ? (
              <FieldError>{deathCauseRefusalMessages[causeProblem]}</FieldError>
            ) : null}
          </Field>
        </div>
        <DrawerFooter className="pt-3">
          {editing ? (
            <Button type="submit" size="lg" className="h-11" disabled={invalid}>
              Save death
            </Button>
          ) : (
            <Button
              type="submit"
              size="lg"
              variant="destructive"
              className="h-11"
              disabled={invalid}
            >
              <SkullIcon aria-hidden />
              Record death
            </Button>
          )}
        </DrawerFooter>
      </form>
    </>
  )
}
