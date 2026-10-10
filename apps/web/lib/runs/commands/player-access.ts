import "server-only"

import { and, eq } from "drizzle-orm"
import { allowAdmission, allowScreening, denyMutation } from "headcanon/server"

import { db } from "@/lib/db"
import { journeys } from "@/lib/db/schema"

import type { RunTransaction } from "../binder"
import { readRunState } from "../canon"
import { lockRun } from "../lock"
import type { RunState } from "../state"

/**
 * The `screen` of a change to the actor's own Journey: denies an actor with
 * no Journey in the Run, before any receipt is claimed.
 */
export async function screenPlayer({
  actor,
  args,
}: {
  actor: string
  args: { runId: string }
}) {
  const [membership] = await db
    .select({ id: journeys.id })
    .from(journeys)
    .where(and(eq(journeys.runId, args.runId), eq(journeys.playerId, actor)))

  return membership ? allowScreening() : denyMutation()
}

/**
 * The `admit` of a change to the actor's own Journey: takes the Run lock and
 * reads the Run for the actor, denying an actor with no Journey in it. The
 * locked Run is the evidence that `execute` checks the change against.
 */
export async function admitPlayer({
  tx,
  actor,
  args,
}: {
  tx: RunTransaction
  actor: string
  args: { runId: string }
}) {
  const run = await lockAndRead(tx, actor, args.runId)

  return run ? allowAdmission({ run }) : denyMutation()
}

/**
 * {@link admitPlayer} for a change that names an Encounter: also denies, with
 * no public reason, an Encounter of another Player's Journey. An Encounter
 * that no Journey has passes, so the shared `check` refuses it as `gone`.
 */
export async function admitEncounterOwner({
  tx,
  actor,
  args,
}: {
  tx: RunTransaction
  actor: string
  args: { runId: string; encounterId: string }
}) {
  const run = await lockAndRead(tx, actor, args.runId)

  if (!run || isAnotherPlayersEncounter(run, actor, args.encounterId)) {
    return denyMutation()
  }

  return allowAdmission({ run })
}

function isAnotherPlayersEncounter(
  run: RunState,
  actor: string,
  encounterId: string
): boolean {
  return run.journeys.some(
    (journey) =>
      journey.playerId !== actor &&
      journey.encounters.some((encounter) => encounter.id === encounterId)
  )
}

async function lockAndRead(tx: RunTransaction, actor: string, runId: string) {
  const row = await lockRun(tx, runId)

  return row && (await readRunState(tx, row, actor))
}
