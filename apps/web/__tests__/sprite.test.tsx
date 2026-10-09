import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it } from "vitest"

import { loadMap, spriteUrl, type LoadedMap } from "@workspace/game-data"

import { Sprite, type SpriteSize } from "../components/sprite"

let map: LoadedMap

beforeAll(async () => {
  map = (await loadMap("emerald"))!
})

afterEach(cleanup)

describe("Sprite", () => {
  it("shows the Form's sprite, labelled with the Species name", () => {
    render(<Sprite map={map} species="treecko" form="base" size={36} />)

    const circle = screen.getByRole("img", { name: "Treecko" })
    const image = circle.querySelector("img")!

    expect(image.getAttribute("src")).toBe(spriteUrl(map, "treecko", "base"))
    expect(image.getAttribute("alt")).toBe("")
  })

  it("hides a sprite that fails to load, leaving the labelled empty circle", () => {
    const { container } = render(
      <Sprite map={map} species="treecko" form="base" size={36} />
    )
    const image = container.querySelector("img")!

    fireEvent.error(image)

    expect(image.hasAttribute("data-error")).toBe(true)
    expect(image.className).toContain("data-error:hidden")
    expect(screen.getByRole("img", { name: "Treecko" })).toBeDefined()
    expect(container.textContent).toBe("")
  })

  it.each([
    [20, 27, false],
    [28, 37, false],
    [32, 43, false],
    [36, 48, true],
    [48, 64, true],
    [64, 85, true],
  ] as const)(
    "draws a %i px circle with a %i px image (pixelated: %s)",
    (size: SpriteSize, drawn, pixelated) => {
      render(<Sprite map={map} species="wailord" form="base" size={size} />)

      const circle = screen.getByRole("img", { name: "Wailord" })
      const image = circle.querySelector("img")!

      expect(circle.style.width).toBe(`${size}px`)
      expect(circle.style.height).toBe(`${size}px`)
      expect(image.style.width).toBe(`${drawn}px`)
      expect(image.style.height).toBe(`${drawn}px`)
      expect(image.className.includes("pixelated")).toBe(pixelated)
    }
  )

  it("shows an empty circle, never letters, for an unknown Species or Form", () => {
    const { container } = render(
      <>
        <Sprite map={map} species="missingno" form="base" size={36} />
        <Sprite map={map} species="treecko" form="missing" size={36} />
      </>
    )

    const unknown = screen.getAllByRole("img", { name: "Unknown Pokémon" })

    expect(unknown).toHaveLength(2)
    expect(container.textContent).toBe("")
    expect(container.querySelector("img")).toBeNull()
  })
})
