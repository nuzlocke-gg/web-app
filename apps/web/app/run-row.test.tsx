import type { MapSummary } from "@workspace/game-data"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"

import { RunRow } from "./run-row"

const hoenn: MapSummary = {
  id: "emerald",
  name: "Emerald",
  region: "Hoenn",
  generation: 3,
  releaseOrder: 1,
  games: [{ id: "emerald", name: "Emerald", monogram: "E" }],
}

const run = {
  id: "6f1c2b8e-3d4a-4f5b-9c6d-7e8f9a0b1c2d",
  name: "Emerald Hardcore",
  mapId: "emerald",
  gameId: "emerald",
}

afterEach(cleanup)

describe("RunRow", () => {
  test("links to the Run with its name and Game", () => {
    render(<RunRow run={run} maps={[hoenn]} />)

    const link = screen.getByRole("link", { name: "Emerald Hardcore, Emerald" })

    expect(link.getAttribute("href")).toBe(`/runs/${run.id}`)
    expect(link.textContent).toContain("E")
  })

  test("a Game the Maps do not know shows as unknown", () => {
    render(<RunRow run={{ ...run, gameId: "ruby" }} maps={[hoenn]} />)

    expect(
      screen.queryByRole("link", { name: "Emerald Hardcore, Unknown game" })
    ).not.toBeNull()
  })
})
