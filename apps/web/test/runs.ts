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
import { journeys, runs } from "@/lib/db/schema"
import { runAxis } from "@/lib/runs/axis"
import { loadRunCanon } from "@/lib/runs/canon"
import type { CorrectEncounterArgs } from "@/lib/runs/changes/correct-encounter"
import type { RecordEncounterArgs } from "@/lib/runs/changes/record-encounter"
import type { RemoveEncounterArgs } from "@/lib/runs/changes/remove-encounter"
import {
  correctEncounter,
  recordEncounter,
  removeEncounter,
} from "@/lib/runs/mutations"
import { createRun } from "@/lib/runs/operations"
import { runProtocol } from "@/lib/runs/protocol"
import { viewerJourney } from "@/lib/runs/state"

import { signedInScope } from "./session"

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
