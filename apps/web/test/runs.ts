import { createOperationEnvelope, type MutationEnvelope } from "headcanon"
import { randomUUID } from "node:crypto"
import { v7 as uuidv7 } from "uuid"

import { createRunAction, runAction } from "@/app/runs/actions"
import { db } from "@/lib/db"
import { journeys, runs } from "@/lib/db/schema"
import type { RecordEncounterArgs } from "@/lib/runs/changes/record-encounter"
import { recordEncounter } from "@/lib/runs/mutations"
import { createRun } from "@/lib/runs/operations"
import { runProtocol } from "@/lib/runs/protocol"

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
 * A `run.v1` envelope for Record an Encounter, as the signed-in Player's Run
 * root sends it.
 */
export function recordEncounterEnvelope(
  args: RecordEncounterArgs
): MutationEnvelope<ReturnType<typeof recordEncounter>> {
  return {
    protocol: runProtocol.id,
    scope: signedInScope(),
    mutationId: randomUUID(),
    createdAt: Date.now(),
    invocation: recordEncounter(args),
  }
}

/** Sends Record an Encounter as the signed-in Player and returns the outcome. */
export function record(args: RecordEncounterArgs) {
  return runAction(recordEncounterEnvelope(args))
}
