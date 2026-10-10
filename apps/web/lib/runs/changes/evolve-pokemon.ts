import type { FormRef } from "@workspace/game-data"
import { unchanged, type Unchanged } from "headcanon"
import { err, ok, type Result } from "serializable-result"
import { z } from "zod"

import { admitsChanges } from "../can-change"
import { refusal, type RunRefusal } from "../refusals"
import {
  byTimeOfEntry,
  findViewerPokemon,
  type EvolutionState,
  type PokemonState,
  type RunState,
} from "../state"
import { formRefArgs, sameForm } from "./form-ref"
import { withPokemon } from "./with-pokemon"

/**
 * The arguments of Evolve a Pokémon, in parsed form: the Species and Form the
 * player saw, the Species and Form it becomes, and where the player picked
 * it. "Next in its line" adds an evolution line, so its id (UUID v7) and
 * `enteredAt` (the client clock in epoch milliseconds) are chosen once, when
 * the player saves. "Other species" corrects a wrong Species.
 */
export const evolvePokemonArgs = z.object({
  runId: z.uuid(),
  pokemonId: z.uuid(),
  /** The Species and Form the Pokémon had when the player picked. */
  from: formRefArgs,
  species: formRefArgs,
  pick: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("next"),
      lineId: z.uuidv7(),
      enteredAt: z.int().nonnegative(),
    }),
    z.object({ kind: z.literal("other") }),
  ]),
})

/** The arguments of Evolve a Pokémon. */
export type EvolvePokemonArgs = z.infer<typeof evolvePokemonArgs>

/** The Refusals that {@link check} gives. */
export type EvolvePokemonRefusal = RunRefusal<"run-not-active" | "gone">

/** What Evolve a Pokémon does to the Pokémon's evolution lines. */
export type EvolutionLineChange =
  /** "Next in its line": a new line. */
  | { kind: "add"; line: EvolutionState }
  /** "Other species" on an evolved Pokémon: its latest line gets the new target. */
  | { kind: "retarget"; id: string }
  /** "Other species" back to where that line started: the line goes. */
  | { kind: "remove"; id: string }

/** What Evolve a Pokémon changes. */
export type EvolvePokemonEffect = {
  journeyId: string
  pokemonId: string
  /** The Pokémon's new current Species and Form. */
  species: FormRef
  /** Null for "Other species" on a Pokémon with no line. */
  line: EvolutionLineChange | null
}

/**
 * Decides Evolve a Pokémon for the viewer's Journey: refused on a Run that is
 * not Active, on a Pokémon that is gone, removed, or dead, and on one whose
 * Species or Form changed since the player picked.
 * @returns {@link unchanged} when the Pokémon already has this Species and Form.
 */
export function check(
  run: RunState,
  args: EvolvePokemonArgs
): Result<EvolvePokemonEffect | Unchanged, EvolvePokemonRefusal> {
  if (!admitsChanges(run)) return err(refusal("run-not-active"))

  const found = findViewerPokemon(run, args.pokemonId)

  if (!found) return err(refusal("gone"))

  const { journey, pokemon } = found

  // A dead Pokémon cannot evolve: the target is in the wrong life state.
  if (pokemon.removedAt !== null || pokemon.diedAt !== null) {
    return err(refusal("gone"))
  }

  if (sameForm(pokemon.species, args.species)) return ok(unchanged())

  // The pick was made for the Species the player saw. Over a Species changed
  // since, it would record a false line: the target is in the wrong state.
  if (!sameForm(pokemon.species, args.from)) return err(refusal("gone"))

  return ok({
    journeyId: journey.id,
    pokemonId: pokemon.id,
    species: args.species,
    line: lineChange(pokemon, args),
  })
}

/**
 * "Next in its line" adds a line. "Other species" is a correction of the
 * latest line into the current Species: it edits that line, or removes it
 * when the Pokémon goes back to the Species the line started from, so a wrong
 * Species leaves no false history.
 */
function lineChange(
  pokemon: PokemonState,
  { species, pick }: EvolvePokemonArgs
): EvolutionLineChange | null {
  if (pick.kind === "next") {
    return {
      kind: "add",
      line: {
        id: pick.lineId,
        from: pokemon.species,
        to: species,
        enteredAt: pick.enteredAt,
      },
    }
  }

  // Lines are in order of the client clock, so a line entered later from a
  // device whose clock is behind can sort before the one that made the
  // current Species. Correct the line that made it, not the last one.
  const latest = [...pokemon.evolutions]
    .reverse()
    .find((line) => line.to.species === pokemon.species.species)

  if (!latest) return null

  return latest.from.species === species.species
    ? { kind: "remove", id: latest.id }
    : { kind: "retarget", id: latest.id }
}

/**
 * Sets the Pokémon's current Species and Form and changes its lines, which
 * stay in the order the canon loader reads them: by time of entry, then id.
 */
export function apply(run: RunState, effect: EvolvePokemonEffect): RunState {
  return withPokemon(run, effect, (pokemon) => ({
    ...pokemon,
    species: effect.species,
    evolutions: withLineChange(pokemon.evolutions, effect),
  }))
}

function withLineChange(
  lines: EvolutionState[],
  { line, species }: EvolvePokemonEffect
): EvolutionState[] {
  switch (line?.kind) {
    case undefined:
      return lines
    case "add":
      return [...lines, line.line].sort(byTimeOfEntry)
    case "retarget":
      return lines.map((candidate) =>
        candidate.id === line.id ? { ...candidate, to: species } : candidate
      )
    case "remove":
      return lines.filter((candidate) => candidate.id !== line.id)
  }
}
