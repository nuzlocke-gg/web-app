import { ok } from "serializable-result"
import { v7 as uuidv7 } from "uuid"
import { describe, expect, test, vi } from "vitest"

import {
  accepted,
  canonOf,
  catchAt,
  denied,
  journeyOf,
  move,
  partnersMudkip,
  recordDeathOf,
  refused,
  revisionOf,
  runWithMudkip,
} from "@/test/runs"

import { movePokemon } from "../mutations"
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

const sixMorePlaces = [
  "route-101",
  "route-102",
  "route-103",
  "route-104",
  "petalburg-city",
  "littleroot-town",
]

/** A Run with a full Party (the Mudkip and five more) and one in the Box. */
async function fullPartyAndOneInBox() {
  const { runId, pokemonId: mudkipId } = await runWithMudkip()
  const caught = await catchAt(runId, sixMorePlaces)

  return { runId, mudkipId, boxedId: caught.at(-1)! }
}

describe("Move a Pokémon", () => {
  test("moves a Pokémon to the Box and bumps the revision", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await expect(
      move({ runId, moves: [{ pokemonId, to: "box" }] })
    ).resolves.toEqual(accepted)
    expect((await journeyOf(runId)).pokemon[0]!.inParty).toBe(false)
    await expect(revisionOf(runId)).resolves.toBe(3)
  })

  test("a swap into a full Party saves both moves in one revision", async () => {
    const { runId, mudkipId, boxedId } = await fullPartyAndOneInBox()
    const revision = await revisionOf(runId)

    await expect(
      move({
        runId,
        moves: [
          { pokemonId: mudkipId, to: "box" },
          { pokemonId: boxedId, to: "party" },
        ],
      })
    ).resolves.toEqual(accepted)

    const journey = await journeyOf(runId)

    expect(partyOf(journey)).toHaveLength(6)
    expect(partyOf(journey).map((pokemon) => pokemon.id)).toContain(boxedId)
    await expect(revisionOf(runId)).resolves.toBe(revision! + 1)
  })

  test("a seventh in the Party is refused as party-full and writes nothing", async () => {
    const { runId, boxedId } = await fullPartyAndOneInBox()

    await expect(
      move({ runId, moves: [{ pokemonId: boxedId, to: "party" }] })
    ).resolves.toEqual(refused("party-full"))
    expect(partyOf(await journeyOf(runId))).toHaveLength(6)
  })

  test("a dead Pokémon is refused as gone", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await recordDeathOf({
      runId,
      pokemonId,
      diedAt: Date.now(),
      level: null,
      cause: null,
    })

    await expect(
      move({ runId, moves: [{ pokemonId, to: "box" }] })
    ).resolves.toEqual(refused("gone"))
  })

  test("a move to where it is already is accepted with no new revision", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await expect(
      move({ runId, moves: [{ pokemonId, to: "party" }] })
    ).resolves.toEqual(accepted)
    await expect(revisionOf(runId)).resolves.toBe(2)
  })

  test("a move of another Player's Pokémon is denied and writes nothing", async () => {
    const { runId, pokemonId } = await partnersMudkip()

    await expect(
      move({ runId, moves: [{ pokemonId, to: "box" }] })
    ).resolves.toEqual(denied)
  })

  test("the predictor and the server give the same Run", async () => {
    const { runId, mudkipId, boxedId } = await fullPartyAndOneInBox()
    const before = await canonOf(runId)
    const args = {
      runId,
      moves: [
        { pokemonId: boxedId, to: "party" as const },
        { pokemonId: mudkipId, to: "box" as const },
      ],
    }
    const predicted = movePokemon.predict(before.value, args, {
      mutationId: uuidv7(),
    })

    await move(args)

    expect(predicted).toEqual(ok((await canonOf(runId)).value))
  })
})
