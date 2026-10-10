import { eq } from "drizzle-orm"
import { ok } from "serializable-result"
import { v7 as uuidv7 } from "uuid"
import { describe, expect, test, vi } from "vitest"

import { db } from "@/lib/db"
import { encounters, pokemon } from "@/lib/db/schema"
import {
  accepted,
  canonOf,
  denied,
  insertJourney,
  insertRun,
  journeyOf,
  refused,
  remove,
  rename,
  revisionOf,
  runWithMudkip,
} from "@/test/runs"
import { signIn } from "@/test/session"

import { renamePokemon } from "../mutations"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
// The action expires the axis cache tag and refreshes the route, which work
// only inside a request.
vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  refresh: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}))

describe("Rename a Pokémon", () => {
  test("sets the nickname and bumps the revision", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await expect(
      rename({ runId, pokemonId, nickname: "Muddy" })
    ).resolves.toEqual(accepted)
    expect((await journeyOf(runId)).pokemon[0]!.nickname).toBe("Muddy")
    await expect(revisionOf(runId)).resolves.toBe(3)
  })

  test("null clears the nickname", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await rename({ runId, pokemonId, nickname: "Muddy" })

    await expect(rename({ runId, pokemonId, nickname: null })).resolves.toEqual(
      accepted
    )
    expect((await journeyOf(runId)).pokemon[0]!.nickname).toBeNull()
  })

  test("renames a dead Pokémon", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await db
      .update(pokemon)
      .set({ diedAt: new Date() })
      .where(eq(pokemon.id, pokemonId))

    await expect(
      rename({ runId, pokemonId, nickname: "Muddy" })
    ).resolves.toEqual(accepted)
    expect((await journeyOf(runId)).pokemon[0]!.nickname).toBe("Muddy")
  })

  test("the nickname it already has is accepted unchanged and keeps the revision", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await expect(rename({ runId, pokemonId, nickname: null })).resolves.toEqual(
      accepted
    )
    await expect(revisionOf(runId)).resolves.toBe(2)
  })

  test("a fresh rename of a Pokémon whose Encounter was removed is refused as gone", async () => {
    const { runId, mudkip, pokemonId } = await runWithMudkip()

    await remove({ runId, encounterId: mudkip.encounterId })

    await expect(
      rename({ runId, pokemonId, nickname: "Muddy" })
    ).resolves.toEqual(refused("gone"))
  })

  test("a Pokémon of another Player's Journey is denied and writes nothing", async () => {
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

    await expect(
      rename({ runId, pokemonId, nickname: "Muddy" })
    ).resolves.toEqual(denied)

    const [row] = await db
      .select({ nickname: pokemon.nickname })
      .from(pokemon)
      .where(eq(pokemon.id, pokemonId))

    expect(row!.nickname).toBeNull()
  })

  test("the predictor and the server give the same Run", async () => {
    const { runId, pokemonId } = await runWithMudkip()
    const before = await canonOf(runId)
    const args = { runId, pokemonId, nickname: "Muddy" }
    const predicted = renamePokemon.predict(before.value, args, {
      mutationId: uuidv7(),
    })

    await rename(args)

    expect(predicted).toEqual(ok((await canonOf(runId)).value))
  })
})
