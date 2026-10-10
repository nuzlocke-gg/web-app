import {
  createOperationEnvelope,
  revisionAt,
  type MutationEnvelope,
} from "headcanon"
import { randomUUID } from "node:crypto"
import { v7 as uuidv7 } from "uuid"
import { expect } from "vitest"

import { createRunAction, runAction } from "@/app/runs/actions"
import { db } from "@/lib/db"
import { encounters, journeys, pokemon, runs } from "@/lib/db/schema"
import { runAxis } from "@/lib/runs/axis"
import { loadRunCanon } from "@/lib/runs/canon"
import type { ChangeFormArgs } from "@/lib/runs/changes/change-form"
import type { CorrectEncounterArgs } from "@/lib/runs/changes/correct-encounter"
import type { EditDeathArgs } from "@/lib/runs/changes/edit-death"
import type { EvolvePokemonArgs } from "@/lib/runs/changes/evolve-pokemon"
import type { MovePokemonArgs } from "@/lib/runs/changes/move-pokemon"
import type { RecordDeathArgs } from "@/lib/runs/changes/record-death"
import type { RecordEncounterArgs } from "@/lib/runs/changes/record-encounter"
import type { RemoveEncounterArgs } from "@/lib/runs/changes/remove-encounter"
import type { RemovePokemonArgs } from "@/lib/runs/changes/remove-pokemon"
import type { RenamePokemonArgs } from "@/lib/runs/changes/rename-pokemon"
import type { UndoDeathArgs } from "@/lib/runs/changes/undo-death"
import {
  changeForm,
  correctEncounter,
  editDeath,
  evolvePokemon,
  movePokemon,
  recordDeath,
  recordEncounter,
  removeEncounter,
  removePokemon,
  renamePokemon,
  undoDeath,
} from "@/lib/runs/mutations"
import { createRun } from "@/lib/runs/operations"
import { runProtocol } from "@/lib/runs/protocol"
import { viewerJourney } from "@/lib/runs/state"

import { signedInScope, signIn } from "./session"

/** The columns of a valid solo Run, for tests that write rows directly. */
export function soloRunValues(
  overrides: Partial<typeof runs.$inferInsert> = {}
): typeof runs.$inferInsert {
  const id = overrides.id ?? randomUUID()

  return {
    id,
    kind: "solo",
    state: "active",
    name: "Emerald Hardcore",
    mapId: "emerald",
    rules: {},
    startedAt: new Date(),
    lastChangedAt: new Date(),
    revision: 1,
    chainId: id,
    attemptNumber: 1,
    ...overrides,
  }
}

/** Inserts a valid solo Run with no Journey and returns its id. */
export async function insertRun(
  overrides: Partial<typeof runs.$inferInsert> = {}
): Promise<string> {
  const values = soloRunValues(overrides)

  await db.insert(runs).values(values)

  return values.id
}

/** Inserts an Emerald Journey for a Player and returns its id. */
export async function insertJourney(
  runId: string,
  playerId: string
): Promise<string> {
  const id = randomUUID()

  await db.insert(journeys).values({ id, runId, playerId, gameId: "emerald" })

  return id
}

/** Makes a solo Emerald Run for the signed-in Player through its action. */
export async function makeRun(): Promise<string> {
  const outcome = await createRunAction(
    createOperationEnvelope(
      createRun,
      { mapId: "emerald", gameId: "emerald", name: "Emerald Hardcore" },
      { scope: signedInScope() }
    )
  )

  if (!outcome.ok || outcome.value.kind !== "accepted") {
    throw new Error(`Expected an accepted Run, got ${JSON.stringify(outcome)}`)
  }

  return outcome.value.result.runId
}

/**
 * The arguments of a Caught Mudkip at the Starter location, Slot 1, entered
 * on 2 October 2026, going to the Party.
 */
export function caughtMudkipArgs(
  runId: string,
  overrides: Partial<RecordEncounterArgs> = {}
): RecordEncounterArgs {
  return {
    runId,
    encounterId: uuidv7(),
    placeId: "starter",
    slot: 1,
    origin: "gift",
    enteredAt: Date.UTC(2026, 9, 2),
    outcome: {
      kind: "caught",
      met: { species: "mudkip", form: "base" },
      pokemonId: uuidv7(),
      goesTo: "party",
    },
    ...overrides,
  }
}

/**
 * Signs a new Player in and makes their Run with a Caught Mudkip at the
 * Starter location, from {@link caughtMudkipArgs}.
 */
export async function runWithMudkip() {
  await signIn()
  const runId = await makeRun()
  const mudkip = caughtMudkipArgs(runId)

  await expect(record(mudkip)).resolves.toEqual(accepted)

  return { runId, mudkip, pokemonId: (await journeyOf(runId)).pokemon[0]!.id }
}

/**
 * A `run.v1` envelope for a change, as the signed-in Player's Run root sends
 * it.
 * @example
 * runAction(runEnvelope(recordEncounter(caughtMudkipArgs(runId))))
 */
export function runEnvelope<Invocation>(
  invocation: Invocation
): MutationEnvelope<Invocation> {
  return {
    protocol: runProtocol.id,
    scope: signedInScope(),
    mutationId: randomUUID(),
    createdAt: Date.now(),
    invocation,
  }
}

/** Sends Record an Encounter as the signed-in Player and returns the outcome. */
export function record(args: RecordEncounterArgs) {
  return runAction(runEnvelope(recordEncounter(args)))
}

/** Sends Correct an Encounter as the signed-in Player and returns the outcome. */
export function correct(args: CorrectEncounterArgs) {
  return runAction(runEnvelope(correctEncounter(args)))
}

/** Sends Remove an Encounter as the signed-in Player and returns the outcome. */
export function remove(args: RemoveEncounterArgs) {
  return runAction(runEnvelope(removeEncounter(args)))
}

/** Sends Rename a Pokémon as the signed-in Player and returns the outcome. */
export function rename(args: RenamePokemonArgs) {
  return runAction(runEnvelope(renamePokemon(args)))
}

/** Sends Evolve a Pokémon as the signed-in Player and returns the outcome. */
export function evolve(args: EvolvePokemonArgs) {
  return runAction(runEnvelope(evolvePokemon(args)))
}

/** Sends Change the Form as the signed-in Player and returns the outcome. */
export function changeFormOf(args: ChangeFormArgs) {
  return runAction(runEnvelope(changeForm(args)))
}

/** Sends Move a Pokémon as the signed-in Player and returns the outcome. */
export function move(args: MovePokemonArgs) {
  return runAction(runEnvelope(movePokemon(args)))
}

/** Sends Record a death as the signed-in Player and returns the outcome. */
export function recordDeathOf(args: RecordDeathArgs) {
  return runAction(runEnvelope(recordDeath(args)))
}

/** Sends Edit a death as the signed-in Player and returns the outcome. */
export function editDeathOf(args: EditDeathArgs) {
  return runAction(runEnvelope(editDeath(args)))
}

/** Sends Undo a death as the signed-in Player and returns the outcome. */
export function undoDeathOf(args: UndoDeathArgs) {
  return runAction(runEnvelope(undoDeath(args)))
}

/** Sends Remove a Pokémon as the signed-in Player and returns the outcome. */
export function removePokemonOf(args: RemovePokemonArgs) {
  return runAction(runEnvelope(removePokemon(args)))
}

/**
 * Records a Caught Encounter at each of these Places of Emerald in the Run, a
 * minute apart from 3 October 2026, each going to the Party while it has
 * room, and returns their Pokémon ids in that order.
 */
export async function catchAt(
  runId: string,
  placeIds: string[]
): Promise<string[]> {
  const ids: string[] = []

  for (const [index, placeId] of placeIds.entries()) {
    const args = caughtMudkipArgs(runId, {
      placeId,
      origin: "wild",
      enteredAt: Date.UTC(2026, 9, 3, 0, index),
    })

    await expect(record(args)).resolves.toEqual(accepted)
    ids.push(args.outcome.kind === "caught" ? args.outcome.pokemonId : "")
  }

  return ids
}

/**
 * Makes a Soul Link Run where Ash has a Mudkip in the Party, then signs Misty
 * in as Ash's partner, so a change from Misty names another Player's Pokémon.
 */
export async function partnersMudkip() {
  const ashId = await signIn()
  const runId = await insertRun({ kind: "soul_link" })
  const journeyId = await insertJourney(runId, ashId)
  const encounterId = uuidv7()
  const pokemonId = uuidv7()

  await db.insert(encounters).values({
    id: encounterId,
    runId,
    journeyId,
    placeId: "starter",
    slotOrdinal: 1,
    origin: "gift",
    outcome: "caught",
    speciesId: "mudkip",
    formId: "base",
    enteredAt: new Date(),
  })
  await db.insert(pokemon).values({
    id: pokemonId,
    journeyId,
    encounterId,
    speciesId: "mudkip",
    formId: "base",
    inParty: true,
  })

  const mistyId = await signIn({ displayName: "Misty" })

  await insertJourney(runId, mistyId)

  return { runId, pokemonId }
}

/** The outcome of an accepted change, for `toEqual`. */
export const accepted = {
  ok: true,
  value: { kind: "accepted", stamp: expect.anything() },
}

/** The outcome of a denied change, for `toEqual`. */
export const denied = { ok: true, value: { kind: "denied" } }

/** The outcome of a change refused with this kind, for `toEqual`. */
export function refused(kind: string) {
  return { ok: true, value: { kind: "refused", error: { kind } } }
}

/** The Run's canon for the signed-in Player; throws when they have none. */
export async function canonOf(runId: string) {
  const canon = await loadRunCanon(runId)

  if (!canon) throw new Error(`Run ${runId} has no canon for this Player`)

  return canon
}

/** The signed-in Player's Journey in the Run, read through the loader. */
export async function journeyOf(runId: string) {
  return viewerJourney((await canonOf(runId)).value)
}

/** The revision of the Run's axis, read through the loader. */
export async function revisionOf(runId: string) {
  return revisionAt((await canonOf(runId)).revisions, runAxis.of(runId))
}
