import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { loadMap } from "@workspace/game-data"
import { Suspense, useState } from "react"
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest"

import type { RunState } from "@/lib/runs/state"
import {
  customPlaceState,
  encounterState,
  journeyState,
  journeyWithPokemon,
  pokemonState,
  runState,
} from "@/test/run-state"

import { EncounterDrawer, recordSheet, type Sheet } from "./encounter-drawer"
import type { LocationRow } from "./encounter-list"
import { useRun, useRunChange } from "./run-root"

// The real root needs the Server Action; the Drawer needs only the Run and
// the function that sends a change.
vi.mock("./run-root", () => ({ useRun: vi.fn(), useRunChange: vi.fn() }))

const change = vi.fn<(invocation: unknown, label: string) => void>()
const onSaved = vi.fn<(place: LocationRow) => void>()
const onAdded = vi.fn<(location: LocationRow) => void>()

const starter: LocationRow = {
  place: { kind: "game", id: "starter" },
  kind: "starter",
  name: "Starter",
}
const route101: LocationRow = {
  place: { kind: "game", id: "route-101" },
  kind: "standard",
  name: "Route 101",
}

// The first load of the Map takes longer than a query waits.
beforeAll(() => loadMap("emerald"))

afterEach(() => {
  cleanup()
  change.mockClear()
  onSaved.mockClear()
  onAdded.mockClear()
})

/** The tracking screen's part: it owns whether the Drawer is open and its step. */
function Harness({ initial }: { initial: Sheet }) {
  const [open, setOpen] = useState(true)
  const [sheet, setSheet] = useState(initial)

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSheet({ step: "places" })
          setOpen(true)
        }}
      >
        Open the Drawer
      </button>
      <EncounterDrawer
        open={open}
        sheet={sheet}
        onSheetChange={setSheet}
        onOpenChange={setOpen}
        onAdded={onAdded}
        onSaved={onSaved}
        onClosed={() => {}}
      />
    </>
  )
}

function mockRun(run: RunState) {
  vi.mocked(useRun).mockReturnValue({ value: run } as never)
  vi.mocked(useRunChange).mockReturnValue(change)
}

async function renderDrawer(run: RunState, initial?: Sheet) {
  mockRun(run)

  const view = await act(async () =>
    render(
      <Suspense fallback={null}>
        <Harness initial={initial ?? recordSheet(run, starter, false)} />
      </Suspense>
    )
  )

  return view
}

function toggle(name: string) {
  return screen.getByRole("button", { name })
}

/** The args of the one Encounter sent. */
function sentArgs() {
  expect(change).toHaveBeenCalledOnce()

  return (change.mock.calls[0]![0] as { args: Record<string, unknown> }).args
}

describe("the record steps", () => {
  test("lists the location's Species by method group, then Other species", async () => {
    await renderDrawer(runState())

    const gift = await screen.findByRole("region", { name: "Gift" })

    expect(gift.textContent).toContain("Mudkip")
    expect(screen.getByRole("region", { name: "Other species" })).toBeTruthy()
    expect(screen.getByPlaceholderText("Search all 386 species")).toBeTruthy()
  })

  test("Species unknown opens the details with Failed selected and Caught disabled", async () => {
    await renderDrawer(runState())

    fireEvent.click(
      await screen.findByRole("button", { name: /Species unknown/ })
    )

    expect(toggle("Failed").getAttribute("aria-pressed")).toBe("true")
    expect(toggle("Caught").hasAttribute("disabled")).toBe(true)
    expect(screen.queryByLabelText("Nickname")).toBeNull()
  })

  test("a full Party selects the Box, disables the Party, and says why", async () => {
    await renderDrawer(
      runState({
        journeys: [journeyWithPokemon(Array.from({ length: 6 }, () => ({})))],
      })
    )

    fireEvent.click(await screen.findByRole("button", { name: /Mudkip/ }))

    expect(toggle("Box").getAttribute("aria-pressed")).toBe("true")
    expect(toggle("Party").hasAttribute("disabled")).toBe(true)
    expect(
      screen.getByText("Your party is full (6 of 6), so it goes to the box.")
    ).toBeTruthy()
  })

  test("a picked Species defaults to Caught with its method group's origin", async () => {
    await renderDrawer(runState())

    fireEvent.click(await screen.findByRole("button", { name: /Mudkip/ }))

    expect(toggle("Caught").getAttribute("aria-pressed")).toBe("true")
    expect(toggle("Gift").getAttribute("aria-pressed")).toBe("true")
    expect(toggle("Party").getAttribute("aria-pressed")).toBe("true")
  })

  test("Save encounter sends the details as an Encounter, trimmed, and closes the Drawer", async () => {
    await renderDrawer(runState())

    fireEvent.click(await screen.findByRole("button", { name: /Mudkip/ }))
    fireEvent.change(screen.getByLabelText("Nickname"), {
      target: { value: "  Muddy " },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save encounter" }))

    expect(change).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "run.record-encounter.v1",
        args: expect.objectContaining({
          place: { kind: "game", id: "starter" },
          slot: 1,
          origin: "gift",
          outcome: expect.objectContaining({
            kind: "caught",
            met: { species: "mudkip", form: "base" },
            nickname: "Muddy",
            goesTo: "party",
          }),
        }),
      }),
      "Encounter"
    )
    expect(onSaved).toHaveBeenCalledWith(starter)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  test("the Slot stays the one the steps opened in when the Run changes", async () => {
    const run = runState()
    const view = await renderDrawer(run, recordSheet(run, route101, false))

    fireEvent.click(await screen.findByRole("button", { name: /Zigzagoon/ }))
    fireEvent.change(screen.getByLabelText("Nickname"), {
      target: { value: "Ziggy" },
    })

    // Another device records Route 101 in Slot 1 meanwhile.
    mockRun(
      runState({
        journeys: [journeyState({ encounters: [encounterState()] })],
      })
    )
    view.rerender(
      <Suspense fallback={null}>
        <Harness initial={recordSheet(run, route101, false)} />
      </Suspense>
    )

    expect(screen.getByLabelText<HTMLInputElement>("Nickname").value).toBe(
      "Ziggy"
    )

    fireEvent.click(screen.getByRole("button", { name: "Save encounter" }))

    expect(sentArgs()).toMatchObject({
      place: { kind: "game", id: "route-101" },
      slot: 1,
    })
  })

  test("the Starter has no way back to the locations", async () => {
    await renderDrawer(runState())

    await screen.findByRole("region", { name: "Gift" })

    expect(
      screen.queryByRole("button", { name: "Back to locations" })
    ).toBeNull()
  })

  test("a picked Species asks before the page unloads", async () => {
    await renderDrawer(runState())

    expect(window.dispatchEvent(unloadEvent())).toBe(true)

    fireEvent.click(await screen.findByRole("button", { name: /Mudkip/ }))

    expect(window.dispatchEvent(unloadEvent())).toBe(false)
  })
})

describe("Add a location", () => {
  const places: Sheet = { step: "places" }

  /** The names of the locations listed under a group's heading. */
  function listed(group: string): string[] {
    return within(screen.getByRole("region", { name: group }))
      .getAllByRole("listitem")
      .map((item) => item.querySelector("[data-slot=item-title]")!.textContent!)
  }

  test("opens on Remaining, A to Z with numbers in order, then the Event locations", async () => {
    await renderDrawer(runState(), places)

    expect(toggle("Remaining 85").getAttribute("aria-pressed")).toBe("true")
    expect(toggle("All 89")).toBeTruthy()
    expect(screen.getByPlaceholderText("Search 89 locations")).toBeTruthy()

    const remaining = listed("No encounter yet")

    expect(remaining).toHaveLength(85)
    expect(remaining.indexOf("Route 102")).toBeLessThan(
      remaining.indexOf("Route 110")
    )
    expect(listed("Event locations")).toContain("Navel Rock")
  })

  test("All shows the Species met under a location with Encounters", async () => {
    await renderDrawer(
      runState({
        journeys: [journeyState({ encounters: [encounterState()] })],
      }),
      places
    )

    fireEvent.click(toggle("All 89"))

    const row = within(screen.getByRole("region", { name: "All locations" }))
      .getByText("Route 101")
      .closest("button")!

    expect(row.textContent).toContain("Zigzagoon")
  })

  test("a location opens step 1 with a way back to the locations", async () => {
    await renderDrawer(runState(), places)

    fireEvent.click(screen.getByRole("button", { name: /^Route 101/ }))

    expect(await screen.findByRole("region", { name: "Walk" })).toBeTruthy()
    expect(screen.getByText("Route 101")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Back to locations" }))

    expect(
      screen.getByRole("region", { name: "No encounter yet" })
    ).toBeTruthy()
  })

  test("a search on Remaining finds a location with an Encounter and records it in a new Slot", async () => {
    await renderDrawer(
      runState({
        journeys: [journeyState({ encounters: [encounterState()] })],
      }),
      places
    )

    fireEvent.change(screen.getByLabelText("Search locations"), {
      target: { value: "route 101" },
    })
    fireEvent.click(
      within(screen.getByRole("region", { name: "Results" })).getByRole(
        "button"
      )
    )

    expect(await screen.findByText("Route 101 · slot 2")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: /Species unknown/ }))
    fireEvent.click(screen.getByRole("button", { name: "Save encounter" }))

    expect(sentArgs()).toMatchObject({
      place: { kind: "game", id: "route-101" },
      slot: 2,
    })
  })

  test("closing sends nothing and keeps the draft for the same location and Slot", async () => {
    await renderDrawer(runState(), places)

    fireEvent.click(screen.getByRole("button", { name: /^Route 101/ }))
    fireEvent.click(await screen.findByRole("button", { name: /Zigzagoon/ }))
    fireEvent.change(screen.getByLabelText("Nickname"), {
      target: { value: "Ziggy" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Close" }))

    expect(screen.queryByRole("dialog")).toBeNull()
    expect(change).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Open the Drawer" }))
    fireEvent.click(await screen.findByRole("button", { name: /^Route 102/ }))

    expect(await screen.findByRole("region", { name: "Walk" })).toBeTruthy()
    expect(screen.queryByLabelText("Nickname")).toBeNull()

    // A draft at Route 102 keeps the one at Route 101.
    fireEvent.click(screen.getByRole("button", { name: /Wurmple/ }))
    fireEvent.click(screen.getByRole("button", { name: "Back to species" }))
    fireEvent.click(screen.getByRole("button", { name: "Back to locations" }))
    fireEvent.click(screen.getByRole("button", { name: /^Route 101/ }))

    expect(screen.getByLabelText<HTMLInputElement>("Nickname").value).toBe(
      "Ziggy"
    )
  })
})

/** A cancelable `beforeunload`; a listener that asks cancels it. */
function unloadEvent() {
  return new Event("beforeunload", { cancelable: true })
}

describe("Custom locations", () => {
  const places: Sheet = { step: "places" }
  const linkTrade = customPlaceState({ name: "Link trade" })

  function nameField() {
    return screen.getByLabelText("Not listed? Add a custom location")
  }

  function addButton() {
    return screen.getByRole("button", { name: "Add location" })
  }

  /** The invocation of the one change sent. */
  function sent() {
    expect(change).toHaveBeenCalledOnce()

    return change.mock.calls[0]![0] as {
      name: string
      args: Record<string, unknown>
    }
  }

  test("Add location is disabled while the name is empty", async () => {
    await renderDrawer(runState(), places)

    expect(addButton()).toHaveProperty("disabled", true)
  })

  test("adding saves the Custom location and opens All species for it", async () => {
    await renderDrawer(runState(), places)

    fireEvent.change(nameField(), { target: { value: "  Link trade " } })
    fireEvent.click(addButton())

    const { name, args } = sent()

    expect(name).toBe("run.add-custom-place.v1")
    expect(args).toMatchObject({ name: "Link trade" })
    expect(onAdded).toHaveBeenCalledWith({
      place: { kind: "custom", id: args.customPlaceId },
      kind: "custom",
      name: "Link trade",
    })
    expect(
      await screen.findByRole("region", { name: "All species" })
    ).toBeTruthy()
    expect(screen.queryByRole("region", { name: "Other species" })).toBeNull()
  })

  test.each([
    ["a location of the Game", "route 101", "route 101"],
    ["a Custom location of the Run", " LINK TRADE ", "LINK TRADE"],
  ])(
    "a name that is %s disables Add location and says so",
    async (_, typed, shown) => {
      await renderDrawer(runState({ customPlaces: [linkTrade] }), places)

      fireEvent.change(nameField(), { target: { value: typed } })

      expect(addButton()).toHaveProperty("disabled", true)
      expect(
        screen.getByText(`There is already a location named “${shown}”.`)
      ).toBeTruthy()
    }
  )

  test("a search that matches no location by its exact name offers to add it", async () => {
    await renderDrawer(runState(), places)

    fireEvent.change(screen.getByLabelText("Search locations"), {
      target: { value: "Link trade" },
    })
    fireEvent.click(screen.getByRole("button", { name: /Add “Link trade”/ }))

    expect(sent().args).toMatchObject({ name: "Link trade" })
  })

  test("a search for a location's exact name, in any letter case, offers nothing", async () => {
    await renderDrawer(runState(), places)

    fireEvent.change(screen.getByLabelText("Search locations"), {
      target: { value: "ROUTE 101" },
    })

    expect(screen.queryByRole("button", { name: /^Add “/ })).toBeNull()
  })

  test("the Custom locations are a group of their own at the end", async () => {
    await renderDrawer(runState({ customPlaces: [linkTrade] }), places)

    const groups = screen
      .getAllByRole("region")
      .map((region) => region.getAttribute("aria-label"))

    expect(groups.at(-1)).toBe("Custom locations")
  })

  test("Rename opens a step that saves the new name", async () => {
    await renderDrawer(runState({ customPlaces: [linkTrade] }), places)

    fireEvent.click(screen.getByRole("button", { name: "More for Link trade" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Rename" }))
    fireEvent.change(await screen.findByLabelText("Name"), {
      target: { value: "Trade from Ruby" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save name" }))

    expect(sent()).toMatchObject({
      name: "run.rename-custom-place.v1",
      args: { customPlaceId: linkTrade.id, name: "Trade from Ruby" },
    })
  })

  test("Remove asks first, then sends the removal", async () => {
    await renderDrawer(runState({ customPlaces: [linkTrade] }), places)

    fireEvent.click(screen.getByRole("button", { name: "More for Link trade" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Remove" }))
    fireEvent.click(
      await screen.findByRole("button", { name: "Remove location" })
    )

    expect(sent()).toMatchObject({
      name: "run.remove-custom-place.v1",
      args: { customPlaceId: linkTrade.id },
    })
  })
})

describe("the Warnings of a save", () => {
  const route104: LocationRow = {
    place: { kind: "game", id: "route-104" },
    kind: "standard",
    name: "Route 104",
  }

  /** Fang the Poochyena on Route 101, then Marill on Route 104. */
  function runWithFangAndMarill(): RunState {
    const fangMet = encounterState({
      place: { kind: "game", id: "route-101" },
      met: { species: "poochyena", form: "base" },
      enteredAt: Date.UTC(2026, 9, 1),
    })
    const marillMet = encounterState({
      place: { kind: "game", id: "route-104" },
      met: { species: "marill", form: "base" },
      enteredAt: Date.UTC(2026, 9, 2),
    })

    return runState({
      rules: {
        "first-encounter": true,
        "nickname-clause": true,
        "duplicate-clause": true,
      },
      journeys: [
        journeyState({
          encounters: [fangMet, marillMet],
          pokemon: [
            pokemonState(fangMet, { nickname: "Fang" }),
            pokemonState(marillMet, { nickname: "Bubbles" }),
          ],
        }),
      ],
    })
  }

  test("step 1 shows the First Encounter Rule and the Duplicate mark", async () => {
    const run = runWithFangAndMarill()

    await renderDrawer(run, recordSheet(run, route104, true))

    const alert = await screen.findByRole("status")

    expect(alert.textContent).toContain(
      "You already have an encounter at Route 104. You can still record this one."
    )

    fireEvent.change(screen.getByPlaceholderText("Search all 386 species"), {
      target: { value: "Mightyena" },
    })

    expect(
      screen.getByRole("button", { name: /Mightyena/ }).textContent
    ).toContain("Same line as Fang")
  })

  test("the details show every Warning the save will cause, and the save goes through", async () => {
    const run = runWithFangAndMarill()

    await renderDrawer(run, recordSheet(run, route104, true))

    fireEvent.change(
      await screen.findByPlaceholderText("Search all 386 species"),
      { target: { value: "Poochyena" } }
    )
    fireEvent.click(screen.getByRole("button", { name: /Poochyena/ }))

    const texts = screen
      .getAllByRole("status")
      .map((element) => element.textContent)

    expect(texts).toEqual([
      expect.stringContaining("Route 104 already has an encounter: Marill."),
      expect.stringContaining("It has no nickname yet."),
      expect.stringContaining(
        "Poochyena is in the same evolution line as Fang (Route 101)."
      ),
    ])

    fireEvent.change(screen.getByLabelText("Nickname"), {
      target: { value: "Shade" },
    })

    expect(screen.queryByText("It has no nickname yet.")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Save encounter" }))

    expect(change).toHaveBeenCalledOnce()
  })

  test("a Rule that is off gives no Warning", async () => {
    const run = { ...runWithFangAndMarill(), rules: {} }

    await renderDrawer(run, recordSheet(run, route104, true))

    fireEvent.change(
      await screen.findByPlaceholderText("Search all 386 species"),
      { target: { value: "Poochyena" } }
    )

    expect(
      screen.getByRole("button", { name: /Poochyena/ }).textContent
    ).not.toContain("Same line as")

    fireEvent.click(screen.getByRole("button", { name: /Poochyena/ }))

    expect(screen.queryByRole("status")).toBeNull()
  })
})
