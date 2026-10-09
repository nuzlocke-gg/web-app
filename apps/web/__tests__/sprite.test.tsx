import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it } from "vitest"

import {
  loadMap,
  spriteUrl,
  unknownSpriteUrl,
  type LoadedMap,
} from "@workspace/game-data"

import { Sprite, type SpriteSize } from "../components/sprite"

let map: LoadedMap

beforeAll(async () => {
  map = (await loadMap("emerald"))!
})

afterEach(cleanup)

/** The sprite's box, found by its label, and its image. */
function spriteNamed(name: string) {
  const box = screen.getByRole("img", { name })

  return { box, image: box.querySelector("img")! }
}

describe("Sprite", () => {
  it("shows the Form's sprite, labelled with the Species name", () => {
    render(<Sprite map={map} species="treecko" form="base" size={36} />)

    const { image } = spriteNamed("Treecko")

    expect(image.getAttribute("src")).toBe(spriteUrl(map, "treecko", "base"))
    expect(image.getAttribute("alt")).toBe("")
  })

  it.each([
    [20, 27, false],
    [28, 37, false],
    [32, 43, false],
    [36, 48, true],
    [48, 64, true],
    [64, 85, true],
  ] as const)(
    "draws a %i px box with a %i px image (pixelated: %s)",
    (size: SpriteSize, drawn, pixelated) => {
      render(<Sprite map={map} species="wailord" form="base" size={size} />)

      const { box, image } = spriteNamed("Wailord")

      expect(box.style.width).toBe(`${size}px`)
      expect(box.style.height).toBe(`${size}px`)
      expect(image.style.width).toBe(`${drawn}px`)
      expect(image.style.height).toBe(`${drawn}px`)
      expect(image.className.includes("pixelated")).toBe(pixelated)
    }
  )

  it("shows the unknown sprite, never letters, for an unknown Species or Form", () => {
    const { container } = render(
      <>
        <Sprite map={map} species="missingno" form="base" size={36} />
        <Sprite map={map} species="treecko" form="missing" size={36} />
      </>
    )

    const unknown = screen.getAllByRole("img", { name: "Unknown Pokémon" })

    expect(unknown).toHaveLength(2)
    expect(container.textContent).toBe("")

    for (const box of unknown) {
      expect(box.querySelector("img")!.getAttribute("src")).toBe(
        unknownSpriteUrl
      )
    }
  })

  it("shows the unknown sprite, keeping the label, when a sprite fails to load", () => {
    const { container } = render(
      <Sprite map={map} species="treecko" form="base" size={36} />
    )

    fireEvent.error(spriteNamed("Treecko").image)

    expect(spriteNamed("Treecko").image.getAttribute("src")).toBe(
      unknownSpriteUrl
    )
    expect(container.textContent).toBe("")
  })

  it("hides the image when the unknown sprite fails to load too", () => {
    render(<Sprite map={map} species="treecko" form="base" size={36} />)

    fireEvent.error(spriteNamed("Treecko").image)
    fireEvent.error(spriteNamed("Treecko").image)

    const { image } = spriteNamed("Treecko")

    expect(image.getAttribute("src")).toBe(unknownSpriteUrl)
    expect(image.hasAttribute("data-error")).toBe(true)
    expect(image.className).toContain("data-error:invisible")
  })
})
