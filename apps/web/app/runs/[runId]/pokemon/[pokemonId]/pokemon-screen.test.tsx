import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { loadMap, type LoadedMap } from "@workspace/game-data"
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest"

import { changeForm, evolvePokemon } from "@/lib/runs/mutations"
import type { PokemonState, RunState } from "@/lib/runs/state"
import {
  encounterState,
  journeyState,
  pokemonState,
  runState,
} from "@/test/run-state"

import { useRun, useRunChange } from "../../run-root"
import { useLoadedMap } from "../../use-map"
import { PokemonScreen } from "./pokemon-screen"

// The real root needs the Server Action, and the real tab lives in the Run
// layout; the screen needs only the Run, the Map, and the function that sends
// a change.
vi.mock("../../run-root", () => ({ useRun: vi.fn(), useRunChange: vi.fn() }))
vi.mock("../../run-tab", () => ({ useRunTab: () => ["encounters", vi.fn()] }))
vi.mock("../../use-map", () => ({ useLoadedMap: vi.fn() }))

const change = vi.fn<(invocation: unknown, label: string) => void>()

let map: LoadedMap

beforeAll(async () => {
  const emerald = (await loadMap("emerald"))!
  const species = new Map(emerald.species)

  // No Species of Emerald has a second Form, so the test Map adds Burmy.
  species.set("burmy", {
    id: "burmy",
    name: "Burmy",
    dex: 412,
    forms: [
      { id: "plant", name: "Plant Cloak", types: ["bug"] },
      { id: "sandy", name: "Sandy Cloak", types: ["bug"] },
      { id: "trash", name: "Trash Cloak", types: ["bug"] },
    ],
    evolvesTo: [],
    evolutionLine: "burmy",
  })
  map = { ...emerald, species }
})

afterEach(() => {
  cleanup()
  change.mockClear()
})

/** Renders the screen for one Pokémon of the viewer, met on Route 116. */
async function renderPokemon(placement: Partial<PokemonState>) {
  const encounter = encounterState({
    placeId: "route-116",
    met: placement.species ?? { species: "nincada", form: "base" },
  })
  const pokemon = pokemonState(encounter, placement)
  const run: RunState = runState({
    journeys: [journeyState({ encounters: [encounter], pokemon: [pokemon] })],
  })

  vi.mocked(useRun).mockReturnValue({ value: run } as never)
  vi.mocked(useRunChange).mockReturnValue(change)
  vi.mocked(useLoadedMap).mockReturnValue(map)

  await act(async () => render(<PokemonScreen pokemonId={pokemon.id} />))

  return { run, pokemon }
}

describe("the Pokémon screen", () => {
  test("shows the Form row only when the Species has more than one Form", async () => {
    await renderPokemon({ species: { species: "ralts", form: "base" } })

    expect(screen.queryByText("Form")).toBeNull()

    cleanup()
    await renderPokemon({
      nickname: "Moss",
      species: { species: "burmy", form: "plant" },
    })

    expect(
      screen.getByRole("button", { name: "Change the form of Moss" })
        .textContent
    ).toContain("Plant Cloak")
  })

  test("Change the form saves the Form picked", async () => {
    const { run, pokemon } = await renderPokemon({
      nickname: "Moss",
      species: { species: "burmy", form: "plant" },
    })

    fireEvent.click(
      screen.getByRole("button", { name: "Change the form of Moss" })
    )

    const drawer = await screen.findByRole("dialog", {
      name: "Change the form of Moss",
    })

    fireEvent.click(within(drawer).getByRole("button", { name: "Sandy Cloak" }))
    fireEvent.click(within(drawer).getByRole("button", { name: "Save form" }))

    expect(change).toHaveBeenCalledWith(
      changeForm({ runId: run.id, pokemonId: pokemon.id, form: "sandy" }),
      "Form change"
    )
  })

  test("a dead Pokémon can be renamed but not evolved", async () => {
    await renderPokemon({ nickname: "Buzz", diedAt: Date.UTC(2026, 9, 3) })

    screen.getByText("Dead")
    screen.getByRole("button", { name: "Rename Buzz" })
    expect(screen.queryByRole("button", { name: /^Evolve/ })).toBeNull()
  })

  test("Evolve says when a Species does not evolve, and corrects with another", async () => {
    const { run, pokemon } = await renderPokemon({
      nickname: "Buzz",
      species: { species: "ninjask", form: "base" },
    })

    fireEvent.click(
      screen.getByRole("button", { name: "Evolve Buzz, now Ninjask" })
    )

    const drawer = await screen.findByRole("dialog", { name: "Evolve Buzz" })

    expect(drawer.textContent).toContain(
      "Ninjask does not evolve further in Emerald."
    )

    fireEvent.change(within(drawer).getByLabelText("Search species"), {
      target: { value: "nincada" },
    })
    fireEvent.click(within(drawer).getByRole("button", { name: /Nincada/ }))
    fireEvent.click(
      within(drawer).getByRole("button", { name: "Change to Nincada" })
    )

    expect(change).toHaveBeenCalledWith(
      evolvePokemon({
        runId: run.id,
        pokemonId: pokemon.id,
        species: { species: "nincada", form: "base" },
        pick: { kind: "other" },
      }),
      "Species correction"
    )
  })

  test("History has the Encounter line with its date", async () => {
    await renderPokemon({})

    const history = screen.getByRole("region", { name: "History" })

    expect(within(history).getByRole("listitem").textContent).toMatch(
      /^Met at Route 116/
    )
  })
})
