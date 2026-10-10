import { describe, expect, test, vi } from "vitest"

import {
  accepted,
  changeFormOf,
  journeyOf,
  refused,
  revisionOf,
  runWithMudkip,
} from "@/test/runs"

import { passesGameDataGate } from "../game-data-gate"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
// The action expires the axis cache tag and refreshes the route, which work
// only inside a request.
vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  refresh: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}))
// No Species of Emerald has a second Form, so the gate passes one here; its
// own tests cover what it refuses.
vi.mock("../game-data-gate", () => ({
  passesGameDataGate: vi.fn(async () => true),
}))

describe("Change the Form", () => {
  test("sets the Form, keeps the Species, adds no line, and bumps the revision", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await expect(
      changeFormOf({ runId, pokemonId, form: "other" })
    ).resolves.toEqual(accepted)

    const [mudkip] = (await journeyOf(runId)).pokemon

    expect(mudkip!.species).toEqual({ species: "mudkip", form: "other" })
    expect(mudkip!.evolutions).toEqual([])
    await expect(revisionOf(runId)).resolves.toBe(3)
  })

  test("the Form it already has is accepted unchanged and keeps the revision", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    await expect(
      changeFormOf({ runId, pokemonId, form: "base" })
    ).resolves.toEqual(accepted)
    await expect(revisionOf(runId)).resolves.toBe(2)
  })

  test("a Form the Game does not have is refused as unknown-entry", async () => {
    const { runId, pokemonId } = await runWithMudkip()

    vi.mocked(passesGameDataGate).mockResolvedValueOnce(false)

    await expect(
      changeFormOf({ runId, pokemonId, form: "other" })
    ).resolves.toEqual(refused("unknown-entry"))
    expect((await journeyOf(runId)).pokemon[0]!.species.form).toBe("base")
  })
})
