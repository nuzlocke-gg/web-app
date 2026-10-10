import { ok } from "serializable-result"
import { v7 as uuidv7 } from "uuid"
import { describe, expect, test, vi } from "vitest"

import {
  accepted,
  canonOf,
  denied,
  journeyOf,
  partnersMudkip,
  recordDeathOf,
  refused,
  remove,
  removePokemonOf,
  revisionOf,
  runWithMudkip,
} from "@/test/runs"

import { historyOf } from "../history"
import { removePokemon } from "../mutations"
import { boxOf, graveyardOf, partyOf } from "../state"

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

describe("Remove a Pokémon", () => {
  test("keeps the row, its Encounter, and its history, out of Party, Box, and Graveyard", async () => {
    const { runId, pokemonId } = await runWithMudkip()
    const before = await journeyOf(runId)

    await expect(
      removePokemonOf({ runId, pokemonId, removedAt: REMOVED_AT })
    ).resolves.toEqual(accepted)

    const journey = await journeyOf(runId)
    const encounter = journey.encounters[0]!

    expect(journey.pokemon[0]!.removedAt).toBe(REMOVED_AT)
    expect(journey.encounters).toEqual(before.encounters)
    expect(historyOf(encounter, journey.pokemon[0]!)).toEqual(
      historyOf(encounter, before.pokemon[0]!)
    )
    expect([
      ...partyOf(journey),
      ...boxOf(journey),
      ...graveyardOf(journey),
    ]).toEqual([])
    await expect(revisionOf(runId)).resolves.toBe(3)
  })

  test("the Encounter of a removed Pokémon can still be removed", async () => {
    const { runId, mudkip, pokemonId } = await runWithMudkip()

    await removePokemonOf({ runId, pokemonId, removedAt: REMOVED_AT })

    await expect(
      remove({ runId, encounterId: mudkip.encounterId })
    ).resolves.toEqual(accepted)

    const journey = await journeyOf(runId)

    expect(journey.encounters).toEqual([])
    expect(journey.pokemon).toEqual([])
  })

  test("a dead Pokémon is refused as gone", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await recordDeathOf({
      runId,
      pokemonId,
      diedAt: REMOVED_AT,
      level: null,
      cause: null,
    })

    await expect(
      removePokemonOf({ runId, pokemonId, removedAt: REMOVED_AT })
    ).resolves.toEqual(refused("gone"))
  })

  test("a second removal is refused as gone", async () => {
    const { runId, pokemonId } = await runWithMudkip()
    const args = { runId, pokemonId, removedAt: REMOVED_AT }

    await removePokemonOf(args)

    await expect(removePokemonOf(args)).resolves.toEqual(refused("gone"))
  })

  test("a Pokémon of another Player's Journey is denied", async () => {
    const { runId, pokemonId } = await partnersMudkip()

    await expect(
      removePokemonOf({ runId, pokemonId, removedAt: REMOVED_AT })
    ).resolves.toEqual(denied)
  })

  test("the predictor and the server give the same Run", async () => {
    const { runId, pokemonId } = await runWithMudkip()
    const before = await canonOf(runId)
    const args = { runId, pokemonId, removedAt: REMOVED_AT }
    const predicted = removePokemon.predict(before.value, args, {
      mutationId: uuidv7(),
    })

    await removePokemonOf(args)

    expect(predicted).toEqual(ok((await canonOf(runId)).value))
  })
})
