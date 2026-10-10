import { and, eq, sql } from "drizzle-orm"
import { defineMutation, defineProtocol, revisionAt } from "headcanon"
import { createNextMutationAction } from "headcanon/next/server"
import {
  allowAdmission,
  allowScreening,
  refuseMutation,
} from "headcanon/server"
import { randomUUID } from "node:crypto"
import { ok } from "serializable-result"
import { v7 as uuidv7 } from "uuid"
import { describe, expect, test, vi } from "vitest"
import { z } from "zod"

import { runAction } from "@/app/runs/actions"
import { db } from "@/lib/db"
import { encounters, journeys, pokemon, runs } from "@/lib/db/schema"
import {
  caughtMudkipArgs,
  insertJourney,
  insertRun,
  makeRun,
  record,
  recordEncounterEnvelope,
} from "@/test/runs"
import { signedInScope, signIn } from "@/test/session"

import { runAxis } from "../axis"
import { runsBinder, type RunTransaction } from "../binder"
import { loadRunCanon, readRunState } from "../canon"
import { bumpRevision, lockRun } from "../lock"
import { recordEncounter } from "../mutations"
import { refusal, refusalSchema } from "../refusals"
import { boxOf, partyOf, viewerJourney, type RunState } from "../state"
import { isSlotTaken } from "./record-encounter"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
// The action expires the axis cache tag and refreshes the route, which work
// only inside a request.
vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  refresh: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}))

// A change that writes an Encounter and bumps the revision, then refuses: the
// one way to see a Refusal roll back writes that already happened.
const writeThenRefuse = defineMutation({
  name: "test.write-then-refuse.v1",
  args: z.object({ runId: z.uuid() }),
  refusal: refusalSchema("gone"),
  predict: (run: RunState) => ok(run),
})

const probeProtocol = defineProtocol<RunState>()({
  id: "run-probe.v1",
  mutations: [writeThenRefuse],
})

const probeAction = createNextMutationAction({
  protocol: probeProtocol,
  binder: runsBinder,
  commands: [
    runsBinder.bind(writeThenRefuse, {
      screen: () => allowScreening(),
      admit: async ({ tx, args }) => {
        await lockRun(tx, args.runId)

        return allowAdmission()
      },
      execute: async ({ tx, actor, args, stamp }) => {
        const [journey] = await tx
          .select({ id: journeys.id })
          .from(journeys)
          .where(
            and(eq(journeys.runId, args.runId), eq(journeys.playerId, actor))
          )

        await tx.insert(encounters).values({
          id: uuidv7(),
          runId: args.runId,
          journeyId: journey!.id,
          placeId: "starter",
          slotOrdinal: 1,
          origin: "gift",
          outcome: "failed",
          enteredAt: new Date(),
        })
        stamp.record(runAxis.of(args.runId), await bumpRevision(tx, args.runId))

        return refuseMutation(refusal("gone"))
      },
    }),
  ],
})

const accepted = {
  ok: true,
  value: { kind: "accepted", stamp: expect.anything() },
}
const denied = { ok: true, value: { kind: "denied" } }

function refused(kind: string) {
  return { ok: true, value: { kind: "refused", error: { kind } } }
}

async function canonOf(runId: string) {
  const canon = await loadRunCanon(runId)

  if (!canon) throw new Error(`Run ${runId} has no canon for this Player`)

  return canon
}

async function journeyOf(runId: string) {
  return viewerJourney((await canonOf(runId)).value)
}

async function revisionOf(runId: string) {
  return revisionAt((await canonOf(runId)).revisions, runAxis.of(runId))
}

/** Records Caught Mudkips at the Starter location in Slots 1 to `count`. */
async function catchMudkips(runId: string, count: number) {
  for (let slot = 1; slot <= count; slot++) {
    await expect(record(caughtMudkipArgs(runId, { slot }))).resolves.toEqual(
      accepted
    )
  }
}

describe("Record an Encounter", () => {
  test("a Caught Encounter makes one Pokémon in the Party and bumps the revision", async () => {
    await signIn()
    const runId = await makeRun()
    const args = caughtMudkipArgs(runId)

    await expect(record(args)).resolves.toEqual(accepted)

    const journey = await journeyOf(runId)

    expect(journey.encounters).toEqual([
      {
        id: args.encounterId,
        placeId: "starter",
        slot: 1,
        origin: "gift",
        outcome: "caught",
        met: { species: "mudkip", form: "base" },
        enteredAt: args.enteredAt,
      },
    ])
    expect(partyOf(journey).map((mon) => mon.encounterId)).toEqual([
      args.encounterId,
    ])
    await expect(revisionOf(runId)).resolves.toBe(2)
  })

  test("a full Party sends a new catch to the Box", async () => {
    await signIn()
    const runId = await makeRun()

    await catchMudkips(runId, 7)

    const journey = await journeyOf(runId)

    expect(partyOf(journey)).toHaveLength(6)
    expect(boxOf(journey)).toHaveLength(1)
  })

  test("a Failed Encounter with no Species saves", async () => {
    await signIn()
    const runId = await makeRun()

    await expect(
      record(caughtMudkipArgs(runId, { outcome: { kind: "failed" } }))
    ).resolves.toEqual(accepted)

    const journey = await journeyOf(runId)

    expect(journey.encounters.map((encounter) => encounter.outcome)).toEqual([
      "failed",
    ])
    expect(journey.encounters[0]!.met).toBeNull()
    expect(journey.pokemon).toEqual([])
  })

  test("the same player on two devices in one Slot gets slot-taken on the second", async () => {
    await signIn()
    const runId = await makeRun()

    await expect(record(caughtMudkipArgs(runId))).resolves.toEqual(accepted)
    await expect(record(caughtMudkipArgs(runId))).resolves.toEqual(
      refused("slot-taken")
    )
    expect((await journeyOf(runId)).encounters).toHaveLength(1)
  })

  test.each([
    ["a Place", { placeId: "not-a-place" }],
    [
      "a Species",
      {
        outcome: {
          kind: "caught" as const,
          met: { species: "pikachu-galar", form: "base" },
          pokemonId: uuidv7(),
          goesTo: "party" as const,
        },
      },
    ],
    [
      "a Form",
      {
        outcome: {
          kind: "failed" as const,
          met: { species: "mudkip", form: "shiny" },
        },
      },
    ],
  ])(
    "%s that the Game does not have is refused as unknown-entry",
    async (_, overrides) => {
      await signIn()
      const runId = await makeRun()

      await expect(record(caughtMudkipArgs(runId, overrides))).resolves.toEqual(
        refused("unknown-entry")
      )
      await expect(revisionOf(runId)).resolves.toBe(1)
    }
  )

  test("an enteredAt from a clock that runs fast is stored as the server's time", async () => {
    await signIn()
    const runId = await makeRun()
    const tomorrow = Date.now() + 24 * 60 * 60 * 1000

    await record(caughtMudkipArgs(runId, { enteredAt: tomorrow }))

    const [encounter] = (await journeyOf(runId)).encounters

    expect(encounter!.enteredAt).toBeLessThanOrEqual(Date.now())
  })

  test("the same envelope retried commits once", async () => {
    await signIn()
    const runId = await makeRun()
    const envelope = recordEncounterEnvelope(caughtMudkipArgs(runId))

    const first = await runAction(envelope)
    const second = await runAction(envelope)

    expect(first).toEqual(accepted)
    expect(second).toEqual(first)
    expect((await journeyOf(runId)).encounters).toHaveLength(1)
    await expect(revisionOf(runId)).resolves.toBe(2)
  })

  test.each([
    ["Failed", { state: "failed" as const, finishedAt: new Date() }],
    ["Waiting", { kind: "soul_link" as const, state: "waiting" as const }],
  ])("a %s Run refuses the change as run-not-active", async (_, columns) => {
    const playerId = await signIn()
    const runId = await insertRun(columns)

    await insertJourney(runId, playerId)

    await expect(record(caughtMudkipArgs(runId))).resolves.toEqual(
      refused("run-not-active")
    )
  })
})

describe("access", () => {
  test("a Player with no Journey in the Run is denied", async () => {
    await signIn()
    const runId = await makeRun()

    await signIn({ displayName: "Misty" })

    await expect(record(caughtMudkipArgs(runId))).resolves.toEqual(denied)
  })

  test("a resent envelope is denied once its Player has no Journey in the Run", async () => {
    const playerId = await signIn()
    const runId = await makeRun()
    const envelope = recordEncounterEnvelope(caughtMudkipArgs(runId))

    await expect(runAction(envelope)).resolves.toEqual(accepted)
    await db
      .delete(journeys)
      .where(and(eq(journeys.runId, runId), eq(journeys.playerId, playerId)))

    await expect(runAction(envelope)).resolves.toEqual(denied)
  })

  test("an envelope made for another Player of the Run is denied and writes nothing", async () => {
    const ashId = await signIn()
    const runId = await insertRun()
    await insertJourney(runId, ashId)
    const ashEnvelope = recordEncounterEnvelope(caughtMudkipArgs(runId))

    const mistyId = await signIn({ displayName: "Misty" })
    await insertJourney(runId, mistyId)

    await expect(runAction(ashEnvelope)).resolves.toEqual(denied)
    expect((await journeyOf(runId)).encounters).toHaveLength(0)
    await expect(revisionOf(runId)).resolves.toBe(1)
  })

  test("a Journey that goes after screening is denied under the Run lock", async () => {
    const playerId = await signIn()
    const runId = await makeRun()
    let sent: ReturnType<typeof record> | undefined

    await db.transaction(async (tx) => {
      await lockRun(tx, runId)
      sent = record(caughtMudkipArgs(runId))
      // Screening read the Journey; admission now waits for this lock.
      await waitUntilBlocking(tx)
      await tx
        .delete(journeys)
        .where(and(eq(journeys.runId, runId), eq(journeys.playerId, playerId)))
    })

    await expect(sent).resolves.toEqual(denied)
  })
})

describe("the predictor and the server", () => {
  test("give the same Run from the same state and arguments", async () => {
    await signIn()
    const runId = await makeRun()
    const before = await canonOf(runId)
    const args = caughtMudkipArgs(runId)

    const predicted = recordEncounter.predict(before.value, args, {
      mutationId: uuidv7(),
    })

    await record(args)

    expect(predicted).toEqual(ok((await canonOf(runId)).value))
  })

  test("agree on the order of a backdated Encounter", async () => {
    await signIn()
    const runId = await makeRun()

    await record(caughtMudkipArgs(runId, { enteredAt: Date.UTC(2026, 9, 5) }))

    const before = await canonOf(runId)
    const args = caughtMudkipArgs(runId, {
      slot: 2,
      enteredAt: Date.UTC(2026, 9, 2),
    })
    const predicted = recordEncounter.predict(before.value, args, {
      mutationId: uuidv7(),
    })

    await record(args)

    expect(predicted).toEqual(ok((await canonOf(runId)).value))
  })
})

describe("concurrency", () => {
  test("the Run lock serializes two catches for the last Party place", async () => {
    await signIn()
    const runId = await makeRun()
    let sent: ReturnType<typeof record>[] = []

    await catchMudkips(runId, 5)

    // Both catches start while the test holds the Run lock, so both have
    // screened and wait together; neither can read the Party first.
    await db.transaction(async (tx) => {
      await lockRun(tx, runId)
      sent = [
        record(caughtMudkipArgs(runId, { slot: 6 })),
        record(caughtMudkipArgs(runId, { slot: 7 })),
      ]
      await waitUntilBlocking(tx, 2)
    })

    await expect(Promise.all(sent)).resolves.toEqual([accepted, accepted])

    const journey = await journeyOf(runId)

    expect(partyOf(journey)).toHaveLength(6)
    expect(boxOf(journey)).toHaveLength(1)
    await expect(revisionOf(runId)).resolves.toBe(8)
  })

  test("a Refusal after writes rolls back every row and the revision", async () => {
    await signIn()
    const runId = await makeRun()
    const envelope = {
      protocol: probeProtocol.id,
      scope: signedInScope(),
      mutationId: randomUUID(),
      createdAt: Date.now(),
      invocation: writeThenRefuse({ runId }),
    }

    await expect(probeAction(envelope)).resolves.toEqual(refused("gone"))
    await expect(probeAction(envelope)).resolves.toEqual(refused("gone"))

    expect((await journeyOf(runId)).encounters).toEqual([])
    await expect(revisionOf(runId)).resolves.toBe(1)
  })

  test("a loader read during a write never pairs an old value with a new revision", async () => {
    const playerId = await signIn()
    const runId = await makeRun()

    await db.transaction(
      async (tx) => {
        // The first read takes the snapshot, as the loader's does.
        const [run] = await tx.select().from(runs).where(eq(runs.id, runId))

        await expect(record(caughtMudkipArgs(runId))).resolves.toEqual(accepted)

        const state = await readRunState(tx, run!, playerId)

        expect(run!.revision).toBe(1)
        expect(viewerJourney(state!).encounters).toEqual([])
      },
      { isolationLevel: "repeatable read", accessMode: "read only" }
    )

    expect((await journeyOf(runId)).encounters).toHaveLength(1)
    await expect(revisionOf(runId)).resolves.toBe(2)
  })
})

describe("isSlotTaken", () => {
  test("matches the Slot index's unique violation from Postgres, and no other", async () => {
    const playerId = await signIn()
    const runId = await insertRun()
    const journeyId = await insertJourney(runId, playerId)
    const encounter = {
      runId,
      journeyId,
      placeId: "starter",
      slotOrdinal: 1,
      origin: "gift" as const,
      outcome: "failed" as const,
      enteredAt: new Date(),
    }
    const encounterId = uuidv7()
    const mudkip = {
      journeyId,
      encounterId,
      speciesId: "mudkip",
      formId: "base",
      inParty: true,
    }

    await db.insert(encounters).values({ ...encounter, id: encounterId })
    await db.insert(pokemon).values({ ...mudkip, id: uuidv7() })

    const slotError = await db
      .insert(encounters)
      .values({ ...encounter, id: uuidv7() })
      .catch((error: unknown) => error)
    const pokemonError = await db
      .insert(pokemon)
      .values({ ...mudkip, id: uuidv7() })
      .catch((error: unknown) => error)

    expect(isSlotTaken(slotError)).toBe(true)
    expect(isSlotTaken(pokemonError)).toBe(false)
  })
})

// Polls until `count` other transactions wait, directly or in a queue, for a
// lock that `tx` holds.
async function waitUntilBlocking(tx: RunTransaction, count = 1) {
  const pid = await tx.execute(sql`SELECT pg_backend_pid() AS pid`)
  const { pid: holder } = pid.rows[0] as { pid: number }

  for (let attempt = 0; attempt < 100; attempt++) {
    // A second waiter queues behind the first, so count transitively.
    const result = await db.execute(
      sql`WITH RECURSIVE blocked(pid) AS (
            SELECT pid FROM pg_stat_activity
            WHERE ${holder}::int = ANY(pg_blocking_pids(pid))
            UNION
            SELECT activity.pid FROM pg_stat_activity AS activity
            JOIN blocked ON blocked.pid = ANY(pg_blocking_pids(activity.pid))
          )
          SELECT count(*)::int AS waiting FROM blocked`
    )

    if ((result.rows[0] as { waiting: number }).waiting >= count) return

    await new Promise((resolve) => setTimeout(resolve, 10))
  }

  throw new Error(`Fewer than ${count} transactions waited for the Run lock`)
}
