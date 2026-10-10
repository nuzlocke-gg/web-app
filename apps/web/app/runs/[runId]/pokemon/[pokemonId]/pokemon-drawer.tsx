"use client"

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
import { Field, FieldError, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { RadioGroup } from "@workspace/ui/components/radio-group"
import { useId, useState } from "react"
import { v7 as uuidv7 } from "uuid"

import { speciesName } from "@/components/species-name"
import { useLeavePrompt } from "@/components/use-leave-prompt"
import { changeForm, evolvePokemon, renamePokemon } from "@/lib/runs/mutations"
import { nicknameRefusal, nicknameRefusalMessages } from "@/lib/runs/nickname"
import type { ViewerPokemon } from "@/lib/runs/state"

import { DrawerHeaderRow } from "../../drawer-header-row"
import { FormChoice } from "../../record-steps"
import { useRun, useRunChange } from "../../run-root"
import { evolveGroups, type SpeciesChoice } from "../../species-choices"
import {
  RadioGrid,
  SpeciesSection,
  speciesChoiceValue,
} from "../../species-grid"

/** Which small Drawer of the Pokémon section is open. */
export type PokemonSheet = "rename" | "evolve" | "form"

type PokemonDrawerProps = {
  map: LoadedMap
  shown: ViewerPokemon
  /** Kept while the Drawer closes. */
  sheet: PokemonSheet
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The small Drawers of the Pokémon section: Rename, Evolve (with "Other
 * species" to correct a wrong one), and Change the Form.
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
