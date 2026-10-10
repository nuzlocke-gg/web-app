import { ok } from "serializable-result"
import { v7 as uuidv7 } from "uuid"
import { describe, expect, test, vi } from "vitest"

import {
  accepted,
  canonOf,
  editDeathOf,
  journeyOf,
  recordDeathOf,
  refused,
  revisionOf,
  runWithMudkip,
} from "@/test/runs"

import { editDeath } from "../mutations"

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

/** A Run whose Mudkip died at level 14 to a crit. */
async function runWithDeadMudkip() {
  const run = await runWithMudkip()

  await expect(
    recordDeathOf({
      runId: run.runId,
      pokemonId: run.pokemonId,
      diedAt: DIED_AT,
      level: 14,
      cause: "Crit",
    })
  ).resolves.toEqual(accepted)

  return run
}

describe("Edit a death", () => {
  test("changes only the level and cause, and bumps the revision", async () => {
    const { runId, pokemonId } = await runWithDeadMudkip()

    await expect(
      editDeathOf({ runId, pokemonId, level: 24, cause: null })
    ).resolves.toEqual(accepted)
    expect((await journeyOf(runId)).pokemon[0]).toMatchObject({
      inParty: true,
      diedAt: DIED_AT,
      deathLevel: 24,
      deathCause: null,
    })
    await expect(revisionOf(runId)).resolves.toBe(4)
  })

  test("the same level and cause are accepted with no new revision", async () => {
    const { runId, pokemonId } = await runWithDeadMudkip()

    await expect(
      editDeathOf({ runId, pokemonId, level: 14, cause: "Crit" })
    ).resolves.toEqual(accepted)
    await expect(revisionOf(runId)).resolves.toBe(3)
  })

  test("a living Pokémon is refused as gone", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await expect(
      editDeathOf({ runId, pokemonId, level: 24, cause: null })
    ).resolves.toEqual(refused("gone"))
  })

  test("a level above the Map's highest level is refused and writes nothing", async () => {
    const { runId, pokemonId } = await runWithDeadMudkip()

    await expect(
      editDeathOf({ runId, pokemonId, level: 101, cause: "Crit" })
    ).resolves.toEqual(refused("level-out-of-range"))
    expect((await journeyOf(runId)).pokemon[0]!.deathLevel).toBe(14)
  })

  test("the predictor and the server give the same Run", async () => {
    const { runId, pokemonId } = await runWithDeadMudkip()
    const before = await canonOf(runId)
    const args = { runId, pokemonId, level: null, cause: "Roxanne's Nosepass" }
    const predicted = editDeath.predict(before.value, args, {
      mutationId: uuidv7(),
    })

    await editDeathOf(args)

    expect(predicted).toEqual(ok((await canonOf(runId)).value))
  })
})
