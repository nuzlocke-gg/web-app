import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { loadMap, type PlaceRow } from "@workspace/game-data"
import { Suspense, useState } from "react"
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest"

import type { RunState } from "@/lib/runs/state"
import {
  encounterState,
  journeyState,
  journeyWithPokemon,
  runState,
} from "@/test/run-state"

import { EncounterDrawer, recordSheet, type Sheet } from "./encounter-drawer"
import { useRun, useRunChange } from "./run-root"

// The real root needs the Server Action; the Drawer needs only the Run and
// the function that sends a change.
vi.mock("./run-root", () => ({ useRun: vi.fn(), useRunChange: vi.fn() }))

const change = vi.fn<(invocation: unknown, label: string) => void>()
const onSaved = vi.fn<(place: PlaceRow) => void>()

const starter: PlaceRow = { id: "starter", kind: "starter", name: "Starter" }
const route101: PlaceRow = {
  id: "route-101",
  kind: "standard",
  name: "Route 101",
}

// The first load of the Map takes longer than a query waits.
beforeAll(() => loadMap("emerald"))

afterEach(() => {
  cleanup()
  change.mockClear()
  onSaved.mockClear()
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
          placeId: "starter",
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

    expect(sentArgs()).toMatchObject({ placeId: "route-101", slot: 1 })
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

    expect(sentArgs()).toMatchObject({ placeId: "route-101", slot: 2 })
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
