import type { FormRef } from "@workspace/game-data"
import { eq } from "drizzle-orm"
import { ok } from "serializable-result"
import { v7 as uuidv7 } from "uuid"
import { describe, expect, test, vi } from "vitest"

import { db } from "@/lib/db"
import { evolutions, pokemon } from "@/lib/db/schema"
import {
  accepted,
  canonOf,
  correct,
  evolve,
  journeyOf,
  refused,
  revisionOf,
  runWithMudkip,
} from "@/test/runs"

import type { EvolvePokemonArgs } from "../changes/evolve-pokemon"
import { evolvePokemon } from "../mutations"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
// The action expires the axis cache tag and refreshes the route, which work
// only inside a request.
vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  refresh: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}))

const mudkip = { species: "mudkip", form: "base" }
const marshtomp = { species: "marshtomp", form: "base" }
const torchic = { species: "torchic", form: "base" }

/** The Species and Form the loader reads for the Run's one Pokémon. */
async function speciesOf(runId: string): Promise<FormRef> {
  return (await journeyOf(runId)).pokemon[0]!.species
}

/** "Next in its line" into `species`, entered on 3 October 2026. */
async function next(
  runId: string,
  pokemonId: string,
  species: FormRef
): Promise<EvolvePokemonArgs> {
  return {
    runId,
    pokemonId,
    from: await speciesOf(runId),
    species,
    pick: {
      kind: "next",
      lineId: uuidv7(),
      enteredAt: Date.UTC(2026, 9, 3),
    },
  }
}

/** "Other species": `species`, to correct a wrong one. */
async function other(
  runId: string,
  pokemonId: string,
  species: FormRef
): Promise<EvolvePokemonArgs> {
  return {
    runId,
    pokemonId,
    from: await speciesOf(runId),
    species,
    pick: { kind: "other" },
  }
}

async function linesOf(pokemonId: string) {
  return db.select().from(evolutions).where(eq(evolutions.pokemonId, pokemonId))
}

describe("Evolve a Pokémon", () => {
  test("Next in its line sets the Species, adds a line, and bumps the revision", async () => {
    const { runId, pokemonId } = await runWithMudkip()
    const args = await next(runId, pokemonId, marshtomp)

    await expect(evolve(args)).resolves.toEqual(accepted)

    const [evolved] = (await journeyOf(runId)).pokemon

    expect(evolved!.species).toEqual(marshtomp)
    expect(evolved!.evolutions).toEqual([
      {
        id: args.pick.kind === "next" && args.pick.lineId,
        from: mudkip,
        to: marshtomp,
        enteredAt: Date.UTC(2026, 9, 3),
      },
    ])
    await expect(revisionOf(runId)).resolves.toBe(3)
  })

  test("Other species edits the target of the latest line", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await evolve(await next(runId, pokemonId, marshtomp))

    await expect(
      evolve(await other(runId, pokemonId, torchic))
    ).resolves.toEqual(accepted)

    const [corrected] = (await journeyOf(runId)).pokemon

    expect(corrected!.species).toEqual(torchic)
    expect(corrected!.evolutions.map((line) => line.to)).toEqual([torchic])
  })

  test("Other species back to where the latest line started removes it", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await evolve(await next(runId, pokemonId, marshtomp))

    await expect(
      evolve(await other(runId, pokemonId, mudkip))
    ).resolves.toEqual(accepted)
    expect((await journeyOf(runId)).pokemon[0]!.species).toEqual(mudkip)
    await expect(linesOf(pokemonId)).resolves.toEqual([])
  })

  test("Other species with no line sets the Species and adds no line", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await expect(
      evolve(await other(runId, pokemonId, torchic))
    ).resolves.toEqual(accepted)
    expect((await journeyOf(runId)).pokemon[0]!.species).toEqual(torchic)
    await expect(linesOf(pokemonId)).resolves.toEqual([])
  })

  test("correcting the Species met leaves an evolved Pokémon as it is", async () => {
    const { runId, mudkip: recorded, pokemonId } = await runWithMudkip()

    // Evolved and back again: the Species matches the one met, but the
    // Pokémon has evolution lines.
    await evolve(await next(runId, pokemonId, marshtomp))
    await evolve(await next(runId, pokemonId, mudkip))

    await expect(
      correct({
        runId,
        encounterId: recorded.encounterId,
        met: torchic,
        origin: recorded.origin,
      })
    ).resolves.toEqual(accepted)

    const journey = await journeyOf(runId)

    expect(journey.encounters[0]!.met).toEqual(torchic)
    expect(journey.pokemon[0]!.species).toEqual(mudkip)
  })

  test("a pick made for a Species that changed since is refused as gone", async () => {
    const { runId, pokemonId } = await runWithMudkip()
    const stale = await next(runId, pokemonId, marshtomp)

    await evolve(await other(runId, pokemonId, torchic))

    await expect(evolve(stale)).resolves.toEqual(refused("gone"))
    expect((await journeyOf(runId)).pokemon[0]!.species).toEqual(torchic)
    await expect(linesOf(pokemonId)).resolves.toEqual([])
  })

  test("the Species it already has is accepted unchanged and keeps the revision", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await expect(evolve(await next(runId, pokemonId, mudkip))).resolves.toEqual(
      accepted
    )
    await expect(revisionOf(runId)).resolves.toBe(2)
    await expect(linesOf(pokemonId)).resolves.toEqual([])
  })

  test("a dead Pokémon cannot evolve", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await db
      .update(pokemon)
      .set({ diedAt: new Date() })
      .where(eq(pokemon.id, pokemonId))

    await expect(
      evolve(await next(runId, pokemonId, marshtomp))
    ).resolves.toEqual(refused("gone"))
  })

  test("a Species the Map does not have is refused as unknown-entry", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await expect(
      evolve(await next(runId, pokemonId, { species: "pikachu", form: "x" }))
    ).resolves.toEqual(refused("unknown-entry"))
    await expect(linesOf(pokemonId)).resolves.toEqual([])
  })

  test("the predictor and the server give the same Run", async () => {
    const { runId, pokemonId } = await runWithMudkip()
    const before = await canonOf(runId)
    const args = await next(runId, pokemonId, marshtomp)
    const predicted = evolvePokemon.predict(before.value, args, {
      mutationId: uuidv7(),
    })

    await evolve(args)

    expect(predicted).toEqual(ok((await canonOf(runId)).value))
  })
})
