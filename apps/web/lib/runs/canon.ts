import "server-only"

import { ORIGINS } from "@workspace/game-data"
import { asc, eq } from "drizzle-orm"
import { defineCanon, type Canon } from "headcanon"
import { cache } from "react"

import { readAccount } from "@/lib/actor"
import { db } from "@/lib/db"
import {
  encounters,
  evolutions,
  journeys,
  pokemon,
  runs,
} from "@/lib/db/schema"

import { isRunId, runAxis } from "./axis"
import type { RunTransaction } from "./binder"
import {
  encounterOutcomes,
  parseKnown,
  runKinds,
  runLifeStates,
  runVisibilities,
  type EncounterState,
  type EvolutionState,
  type PokemonState,
  type RunState,
} from "./state"

/** A Run row as the database returns it. */
export type RunRow = typeof runs.$inferSelect

/**
 * Reads one Run for the signed-in Player, uncached, with the revision of its
 * axis. Null when nobody is signed in, the id is not a UUID, the Run does not
 * exist, or the Player has no Journey in it, so the page never tells which.
 * Shared by the Run layout and its pages within one render.
 */
export const loadRunCanon = cache(
  async (runId: string): Promise<Canon<RunState> | null> => {
    const account = await readAccount()

    if (!account || !isRunId(runId)) return null

    return readRunCanon(runId, account.id)
  }
)

// Membership, the value, and the revision come from one snapshot, so a write
// that commits between two reads can never pair an old value with a new
// revision.
async function readRunCanon(
  runId: string,
  viewerId: string
): Promise<Canon<RunState> | null> {
  return db.transaction(
    async (tx) => {
      const [run] = await tx.select().from(runs).where(eq(runs.id, runId))

      if (!run) return null

      const value = await readRunState(tx, run, viewerId)

      if (!value) return null

      return defineCanon<RunState>({
        value,
        revisions: { [runAxis.of(run.id)]: run.revision },
      })
    },
    { isolationLevel: "repeatable read", accessMode: "read only" }
  )
}

/**
 * Reads the rest of a Run whose row the transaction already holds, for one
 * viewer: the canon loader calls it in its snapshot, and each command's
 * `admit` under the Run lock, so both see the Run the same way.
 * @returns Null when the viewer has no Journey in the Run.
 */
export async function readRunState(
  tx: RunTransaction,
  run: RunRow,
  viewerId: string
): Promise<RunState | null> {
  const runJourneys = await tx
    .select({
      id: journeys.id,
      playerId: journeys.playerId,
      gameId: journeys.gameId,
    })
    .from(journeys)
    .where(eq(journeys.runId, run.id))
    .orderBy(asc(journeys.joinedAt), asc(journeys.id))

  if (!runJourneys.some((journey) => journey.playerId === viewerId)) {
    return null
  }

  const encounterRows = await tx
    .select()
    .from(encounters)
    .where(eq(encounters.runId, run.id))
    .orderBy(asc(encounters.enteredAt), asc(encounters.id))

  // In the order of their Encounters, as `apply` keeps them.
  const pokemonRows = await tx
    .select({ pokemon })
    .from(pokemon)
    .innerJoin(encounters, eq(encounters.id, pokemon.encounterId))
    .where(eq(encounters.runId, run.id))
    .orderBy(asc(encounters.enteredAt), asc(encounters.id))

  // By time of entry, then id, as `apply` keeps them.
  const evolutionRows = await tx
    .select({ evolution: evolutions })
    .from(evolutions)
    .innerJoin(pokemon, eq(pokemon.id, evolutions.pokemonId))
    .innerJoin(encounters, eq(encounters.id, pokemon.encounterId))
    .where(eq(encounters.runId, run.id))
    .orderBy(asc(evolutions.enteredAt), asc(evolutions.id))

  return {
    id: run.id,
    viewerId,
    name: run.name,
    mapId: run.mapId,
    kind: parseKnown(runKinds, run.kind),
    state: parseKnown(runLifeStates, run.state),
    visibility: parseKnown(runVisibilities, run.visibility),
    attemptNumber: run.attemptNumber,
    rules: run.rules,
    journeys: runJourneys.map((journey) => ({
      ...journey,
      encounters: encounterRows
        .filter((row) => row.journeyId === journey.id)
        .map(toEncounterState),
      pokemon: pokemonRows
        .filter((row) => row.pokemon.journeyId === journey.id)
        .map((row) =>
          toPokemonState(
            row.pokemon,
            evolutionRows
              .filter((line) => line.evolution.pokemonId === row.pokemon.id)
              .map((line) => line.evolution)
          )
        ),
    })),
  }
}

function toEncounterState(row: typeof encounters.$inferSelect): EncounterState {
  // NUZ-54 reads Encounters at a Custom Place; until then every row has a
  // Place of the Map.
  if (row.placeId === null) {
    throw new Error(`Encounter ${row.id} has no Place of the Map`)
  }

  return {
    id: row.id,
    placeId: row.placeId,
    slot: row.slotOrdinal,
    origin: parseKnown(ORIGINS, row.origin),
    outcome: parseKnown(encounterOutcomes, row.outcome),
    met:
      row.speciesId !== null && row.formId !== null
        ? { species: row.speciesId, form: row.formId }
        : null,
    enteredAt: row.enteredAt.getTime(),
  }
}

function toPokemonState(
  row: typeof pokemon.$inferSelect,
  lines: (typeof evolutions.$inferSelect)[]
): PokemonState {
  return {
    id: row.id,
    encounterId: row.encounterId,
    species: { species: row.speciesId, form: row.formId },
    nickname: row.nickname,
    inParty: row.inParty,
    diedAt: row.diedAt?.getTime() ?? null,
    deathLevel: row.deathLevel,
    deathCause: row.deathCause,
    removedAt: row.removedAt?.getTime() ?? null,
    evolutions: lines.map(toEvolutionState),
  }
}

function toEvolutionState(row: typeof evolutions.$inferSelect): EvolutionState {
  return {
    id: row.id,
    from: { species: row.speciesFrom, form: row.formFrom },
    to: { species: row.speciesTo, form: row.formTo },
    enteredAt: row.enteredAt.getTime(),
  }
}
