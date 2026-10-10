import { ok } from "serializable-result"
import { v7 as uuidv7 } from "uuid"
import { describe, expect, test, vi } from "vitest"

import {
  accepted,
  canonOf,
  catchAt,
  denied,
  journeyOf,
  partnersMudkip,
  refused,
  removePokemonOf,
  restorePokemonOf,
  revisionOf,
  runWithMudkip,
} from "@/test/runs"

import { restorePokemon } from "../mutations"
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

const REMOVED_AT = Date.UTC(2026, 9, 3)

/** A Run whose Mudkip was removed from the Party. */
async function runWithRemovedMudkip() {
  const run = await runWithMudkip()

  await expect(
    removePokemonOf({
      runId: run.runId,
      pokemonId: run.pokemonId,
      removedAt: REMOVED_AT,
    })
  ).resolves.toEqual(accepted)

  return run
}

describe("Restore a Pokémon", () => {
  test("returns it to the Party and bumps the revision", async () => {
    const { runId, pokemonId } = await runWithRemovedMudkip()

    await expect(restorePokemonOf({ runId, pokemonId })).resolves.toEqual(
      accepted
    )
    expect((await journeyOf(runId)).pokemon[0]).toMatchObject({
      removedAt: null,
      inParty: true,
    })
    await expect(revisionOf(runId)).resolves.toBe(4)
  })

  test("sends it to the Box when the Party filled meanwhile", async () => {
    const { runId, pokemonId } = await runWithRemovedMudkip()

    await catchAt(runId, [
      "route-101",
      "route-102",
      "route-103",
      "route-104",
      "petalburg-city",
      "littleroot-town",
    ])

    await expect(restorePokemonOf({ runId, pokemonId })).resolves.toEqual(
      accepted
    )

    const journey = await journeyOf(runId)

    expect(journey.pokemon[0]!.inParty).toBe(false)
    expect(partyOf(journey)).toHaveLength(6)
  })

  test("a Pokémon that is not removed is refused as gone", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await expect(restorePokemonOf({ runId, pokemonId })).resolves.toEqual(
      refused("gone")
    )
  })

  test("a Pokémon of another Player's Journey is denied", async () => {
    const { runId, pokemonId } = await partnersMudkip()

    await expect(restorePokemonOf({ runId, pokemonId })).resolves.toEqual(
      denied
    )
  })

  test("the predictor and the server give the same Run", async () => {
    const { runId, pokemonId } = await runWithRemovedMudkip()
    const before = await canonOf(runId)
    const args = { runId, pokemonId }
    const predicted = restorePokemon.predict(before.value, args, {
      mutationId: uuidv7(),
    })

    await restorePokemonOf(args)

    expect(predicted).toEqual(ok((await canonOf(runId)).value))
  })
})
