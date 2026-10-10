import { eq } from "drizzle-orm"
import { ok } from "serializable-result"
import { v7 as uuidv7 } from "uuid"
import { describe, expect, test, vi } from "vitest"

import { db } from "@/lib/db"
import { pokemon } from "@/lib/db/schema"
import {
  accepted,
  canonOf,
  denied,
  journeyOf,
  partnersMudkip,
  recordDeathOf,
  refused,
  revisionOf,
  runWithMudkip,
} from "@/test/runs"

import { recordDeath } from "../mutations"
import { graveyardOf, partyOf } from "../state"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
// The action expires the axis cache tag and refreshes the route, which work
// only inside a request.
vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  refresh: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}))

const DIED_AT = Date.UTC(2026, 9, 3)

describe("Record a death", () => {
  test("stores the death, keeps in_party, and bumps the revision", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await expect(
      recordDeathOf({
        runId,
        pokemonId,
        diedAt: DIED_AT,
        level: 24,
        cause: "Roxanne's Nosepass",
      })
    ).resolves.toEqual(accepted)

    const journey = await journeyOf(runId)

    expect(journey.pokemon[0]).toMatchObject({
      inParty: true,
      diedAt: DIED_AT,
      deathLevel: 24,
      deathCause: "Roxanne's Nosepass",
    })
    expect(partyOf(journey)).toEqual([])
    expect(graveyardOf(journey)).toHaveLength(1)
    await expect(revisionOf(runId)).resolves.toBe(3)
  })

  test("a time of death ahead of the server's clock is stored as now", async () => {
    const { runId, pokemonId } = await runWithMudkip()
    const later = Date.now() + 60 * 60 * 1000

    await recordDeathOf({
      runId,
      pokemonId,
      diedAt: later,
      level: null,
      cause: null,
    })

    expect((await journeyOf(runId)).pokemon[0]!.diedAt).toBeLessThan(later)
  })

  test("a Pokémon that is already dead is refused as gone", async () => {
    const { runId, pokemonId } = await runWithMudkip()
    const args = { runId, pokemonId, diedAt: DIED_AT, level: null, cause: null }

    await recordDeathOf(args)

    await expect(recordDeathOf({ ...args, level: 30 })).resolves.toEqual(
      refused("gone")
    )
    expect((await journeyOf(runId)).pokemon[0]!.deathLevel).toBeNull()
  })

  test("a level above the Map's highest level is refused and writes nothing", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await expect(
      recordDeathOf({
        runId,
        pokemonId,
        diedAt: DIED_AT,
        level: 101,
        cause: null,
      })
    ).resolves.toEqual(refused("level-out-of-range"))
    expect((await journeyOf(runId)).pokemon[0]!.diedAt).toBeNull()
  })

  test("level 100 is in range in Emerald", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await expect(
      recordDeathOf({
        runId,
        pokemonId,
        diedAt: DIED_AT,
        level: 100,
        cause: null,
      })
    ).resolves.toEqual(accepted)
  })

  test("a Pokémon of another Player's Journey is denied and writes nothing", async () => {
    const { runId, pokemonId } = await partnersMudkip()

    await expect(
      recordDeathOf({
        runId,
        pokemonId,
        diedAt: DIED_AT,
        level: null,
        cause: null,
      })
    ).resolves.toEqual(denied)

    const [row] = await db
      .select({ diedAt: pokemon.diedAt })
      .from(pokemon)
      .where(eq(pokemon.id, pokemonId))

    expect(row!.diedAt).toBeNull()
  })

  test("the predictor and the server give the same Run", async () => {
    const { runId, pokemonId } = await runWithMudkip()
    const before = await canonOf(runId)
    const args = { runId, pokemonId, diedAt: DIED_AT, level: 14, cause: "Crit" }
    const predicted = recordDeath.predict(before.value, args, {
      mutationId: uuidv7(),
    })

    await recordDeathOf(args)

    expect(predicted).toEqual(ok((await canonOf(runId)).value))
  })
})
