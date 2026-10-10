import { ok } from "serializable-result"
import { v7 as uuidv7 } from "uuid"
import { describe, expect, test, vi } from "vitest"

import {
  accepted,
  canonOf,
  catchAt,
  journeyOf,
  move,
  recordDeathOf,
  refused,
  revisionOf,
  runWithMudkip,
  undoDeathOf,
} from "@/test/runs"

import { undoDeath } from "../mutations"
import { partyOf } from "../state"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
// The action expires the axis cache tag and refreshes the route, which work
// only inside a request.
vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  refresh: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}))

/** Records the Mudkip's death with a level and a cause. */
async function kill(runId: string, pokemonId: string) {
  await expect(
    recordDeathOf({
      runId,
      pokemonId,
      diedAt: Date.UTC(2026, 9, 3),
      level: 14,
      cause: "Crit",
    })
  ).resolves.toEqual(accepted)
}

describe("Undo a death", () => {
  test("returns it to the Party it died in and clears the death", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await kill(runId, pokemonId)

    await expect(undoDeathOf({ runId, pokemonId })).resolves.toEqual(accepted)
    expect((await journeyOf(runId)).pokemon[0]).toMatchObject({
      inParty: true,
      diedAt: null,
      deathLevel: null,
      deathCause: null,
    })
    await expect(revisionOf(runId)).resolves.toBe(4)
  })

  test("returns a Pokémon that died in the Box to the Box", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await move({ runId, moves: [{ pokemonId, to: "box" }] })
    await kill(runId, pokemonId)
    await undoDeathOf({ runId, pokemonId })

    expect((await journeyOf(runId)).pokemon[0]!.inParty).toBe(false)
  })

  test("sends it to the Box when the Party filled meanwhile", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await kill(runId, pokemonId)
    await catchAt(runId, [
      "route-101",
      "route-102",
      "route-103",
      "route-104",
      "petalburg-city",
      "littleroot-town",
    ])

    await expect(undoDeathOf({ runId, pokemonId })).resolves.toEqual(accepted)

    const journey = await journeyOf(runId)

    expect(journey.pokemon[0]!.inParty).toBe(false)
    expect(partyOf(journey)).toHaveLength(6)
  })

  test("a living Pokémon is refused as gone", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await expect(undoDeathOf({ runId, pokemonId })).resolves.toEqual(
      refused("gone")
    )
  })

  test("the predictor and the server give the same Run", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await kill(runId, pokemonId)

    const before = await canonOf(runId)
    const args = { runId, pokemonId }
    const predicted = undoDeath.predict(before.value, args, {
      mutationId: uuidv7(),
    })

    await undoDeathOf(args)

    expect(predicted).toEqual(ok((await canonOf(runId)).value))
  })
})
