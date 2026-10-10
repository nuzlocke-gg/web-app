import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { loadMap, type LoadedMap } from "@workspace/game-data"
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest"

import {
  changeForm,
  editDeath,
  evolvePokemon,
  movePokemon,
  recordDeath,
  removePokemon,
  undoDeath,
} from "@/lib/runs/mutations"
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

/**
 * Renders the screen for one Pokémon of the viewer, met on Route 116, beside
 * other Pokémon of the viewer, each a Zigzagoon met on its own Route 1xx.
 */
async function renderPokemon(
  placement: Partial<PokemonState>,
  others: Partial<PokemonState>[] = []
) {
  const encounter = encounterState({
    placeId: "route-116",
    met: placement.species ?? { species: "nincada", form: "base" },
  })
  const pokemon = pokemonState(encounter, placement)
  const otherEncounters = others.map((_, index) =>
    encounterState({ placeId: `route-${101 + index}` })
  )
  const run: RunState = runState({
    journeys: [
      journeyState({
        encounters: [encounter, ...otherEncounters],
        pokemon: [
          pokemon,
          ...others.map((other, index) =>
            pokemonState(otherEncounters[index]!, other)
          ),
        ],
      }),
    ],
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
    fireEvent.click(within(drawer).getByRole("radio", { name: "Nincada" }))
    fireEvent.click(
      within(drawer).getByRole("button", { name: "Change to Nincada" })
    )

    expect(change).toHaveBeenCalledWith(
      evolvePokemon({
        runId: run.id,
        pokemonId: pokemon.id,
        from: { species: "ninjask", form: "base" },
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

  test("Box moves a Party Pokémon at once", async () => {
    const { run, pokemon } = await renderPokemon({ nickname: "Buzz" })

    expect(screen.getByText("Your party, 1 of 6")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Box" }))

    expect(change).toHaveBeenCalledWith(
      movePokemon({
        runId: run.id,
        moves: [{ pokemonId: pokemon.id, to: "box" }],
      }),
      "Move"
    )
  })

  test("Party on a full Party opens the swap and saves two moves", async () => {
    const { run, pokemon } = await renderPokemon(
      { nickname: "Buzz", inParty: false },
      [{ nickname: "Fang" }, {}, {}, {}, {}, {}]
    )
    const fang = run.journeys[0]!.pokemon.find(
      (candidate) => candidate.nickname === "Fang"
    )!

    fireEvent.click(screen.getByRole("button", { name: "Party" }))

    const drawer = await screen.findByRole("dialog", {
      name: "Your party is full",
    })

    expect(change).not.toHaveBeenCalled()

    fireEvent.click(within(drawer).getByRole("radio", { name: /Fang/ }))
    fireEvent.click(
      within(drawer).getByRole("button", { name: "Send Fang to the box" })
    )

    expect(change).toHaveBeenCalledWith(
      movePokemon({
        runId: run.id,
        moves: [
          { pokemonId: fang.id, to: "box" },
          { pokemonId: pokemon.id, to: "party" },
        ],
      }),
      "Party swap"
    )
  })

  test("Record death saves the level and cause typed", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 9, 3))
    const { run, pokemon } = await renderPokemon({ nickname: "Buzz" })

    fireEvent.click(screen.getByRole("button", { name: "Record death" }))

    const drawer = await screen.findByRole("dialog", {
      name: "Record a death",
    })

    fireEvent.change(within(drawer).getByLabelText("Level (optional)"), {
      target: { value: "24" },
    })
    fireEvent.change(within(drawer).getByLabelText("Cause (optional)"), {
      target: { value: " Roxanne's Nosepass " },
    })
    fireEvent.click(
      within(drawer).getByRole("button", { name: "Record death" })
    )

    expect(change).toHaveBeenCalledWith(
      recordDeath({
        runId: run.id,
        pokemonId: pokemon.id,
        diedAt: Date.UTC(2026, 9, 3),
        level: 24,
        cause: "Roxanne's Nosepass",
      }),
      "Death"
    )
    vi.mocked(Date.now).mockRestore()
  })

  test("a level above the Map's highest level is refused in the Drawer", async () => {
    await renderPokemon({ nickname: "Buzz" })

    fireEvent.click(screen.getByRole("button", { name: "Record death" }))

    const drawer = await screen.findByRole("dialog", {
      name: "Record a death",
    })

    fireEvent.change(within(drawer).getByLabelText("Level (optional)"), {
      target: { value: "101" },
    })

    expect(drawer.textContent).toContain("Use a level from 1 to 100.")
    expect(
      within(drawer).getByRole("button", { name: "Record death" })
    ).toHaveProperty("disabled", true)
  })

  test("a dead Pokémon shows its Graveyard box, and Edit opens the death prefilled", async () => {
    const { run, pokemon } = await renderPokemon({
      nickname: "Spore",
      diedAt: Date.UTC(2026, 9, 3),
      deathLevel: 14,
    })
    const graveyard = screen.getByRole("region", { name: "Graveyard" })

    expect(graveyard.textContent).toContain("Died at level 14")
    expect(graveyard.textContent).toContain("No cause recorded")
    expect(screen.queryByRole("region", { name: "Where" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Record death" })).toBeNull()

    fireEvent.click(
      screen.getByRole("button", { name: "Edit the death of Spore" })
    )

    const drawer = await screen.findByRole("dialog", {
      name: "Edit the death of Spore",
    })

    expect(
      within(drawer).getByLabelText<HTMLInputElement>("Level (optional)").value
    ).toBe("14")

    fireEvent.change(within(drawer).getByLabelText("Cause (optional)"), {
      target: { value: "Crit" },
    })
    fireEvent.click(within(drawer).getByRole("button", { name: "Save death" }))

    expect(change).toHaveBeenCalledWith(
      editDeath({
        runId: run.id,
        pokemonId: pokemon.id,
        level: 14,
        cause: "Crit",
      }),
      "Death edit"
    )
  })

  test("Undo death says where it goes and saves the undo", async () => {
    const { run, pokemon } = await renderPokemon(
      { nickname: "Spore", diedAt: Date.UTC(2026, 9, 3) },
      [{}, {}, {}, {}, {}, {}]
    )

    expect(
      screen.getByText(
        "For a mistake. Spore goes back to the box, because your party is full."
      )
    ).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Undo death" }))

    expect(change).toHaveBeenCalledWith(
      undoDeath({ runId: run.id, pokemonId: pokemon.id }),
      "Undo death"
    )
  })

  test("Remove Pokémon confirms, then saves the removal", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 9, 3))
    const { run, pokemon } = await renderPokemon({ nickname: "Buzz" })

    fireEvent.click(screen.getByRole("button", { name: "Remove Pokémon" }))

    const dialog = await screen.findByRole("alertdialog", {
      name: "Remove Buzz?",
    })

    expect(dialog.textContent).toContain(
      "Its encounter at Route 116 and its history stay."
    )

    fireEvent.click(within(dialog).getByRole("button", { name: "Remove Buzz" }))

    expect(change).toHaveBeenCalledWith(
      removePokemon({
        runId: run.id,
        pokemonId: pokemon.id,
        removedAt: Date.UTC(2026, 9, 3),
      }),
      "Removal"
    )
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
    vi.mocked(Date.now).mockRestore()
  })

  test("a removed Pokémon has no Pokémon actions but keeps Correct encounter", async () => {
    await renderPokemon({
      nickname: "Buzz",
      removedAt: Date.UTC(2026, 9, 3),
    })

    screen.getByText("Removed")
    screen.getByRole("region", { name: "History" })
    screen.getByRole("button", { name: "Correct encounter" })
    expect(screen.queryByRole("region", { name: "Where" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Record death" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Remove Pokémon" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Rename Buzz" })).toBeNull()
  })
})
