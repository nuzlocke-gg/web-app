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

import type { EncounterState, RunState } from "@/lib/runs/state"
import {
  encounterState,
  journeyState,
  pokemonState,
  runState,
} from "@/test/run-state"

import { CorrectDrawer } from "./correct-drawer"
import { useRun, useRunChange } from "./run-root"

// The real root needs the Server Action; the Drawer needs only the Run and
// the function that sends a change.
vi.mock("./run-root", () => ({ useRun: vi.fn(), useRunChange: vi.fn() }))

const change = vi.fn<(invocation: unknown, label: string) => void>()

const failed = encounterState({
  placeId: "route-102",
  outcome: "failed",
  met: null,
  origin: "wild",
})
const caught = encounterState({
  placeId: "route-102",
  slot: 2,
  met: { species: "ralts", form: "base" },
})
const mimi = pokemonState(caught, { nickname: "Mimi" })

// The first load of the Map takes longer than a query waits.
beforeAll(() => loadMap("emerald"))

afterEach(() => {
  cleanup()
  change.mockClear()
})

function runWith(
  encounters: EncounterState[],
  pokemon = encounters.includes(caught) ? [mimi] : []
): RunState {
  return runState({ journeys: [journeyState({ encounters, pokemon })] })
}

function mockRun(run: RunState) {
  vi.mocked(useRun).mockReturnValue({ value: run } as never)
  vi.mocked(useRunChange).mockReturnValue(change)
}

/** The tracking screen's part: it owns which Encounter and whether it is open. */
function Harness({ encounterId }: { encounterId: string }) {
  const [open, setOpen] = useState(true)

  return (
    <CorrectDrawer
      encounterId={encounterId}
      open={open}
      onOpenChange={setOpen}
    />
  )
}

async function renderDrawer(run: RunState, encounter: EncounterState) {
  mockRun(run)

  return act(async () =>
    render(
      <Suspense fallback={null}>
        <Harness encounterId={encounter.id} />
      </Suspense>
    )
  )
}

function toggle(name: string) {
  return screen.getByRole("button", { name })
}

/** The one change sent, with its label. */
function sent() {
  expect(change).toHaveBeenCalledOnce()

  const [invocation, label] = change.mock.calls[0]!

  return { ...(invocation as { name: string; args: unknown }), label }
}

describe("the Correct Drawer", () => {
  test("shows the location and Slot as text, the Species met, and the Origin", async () => {
    await renderDrawer(runWith([caught]), caught)

    expect(await screen.findByText("Route 102 · slot 2")).toBeTruthy()
    expect(screen.getByText("Ralts")).toBeTruthy()
    expect(
      screen.getByText("It stays the same after an evolution.")
    ).toBeTruthy()
    expect(toggle("Wild").getAttribute("aria-pressed")).toBe("true")
  })

  test("shows the outcome as text, with how to change it", async () => {
    await renderDrawer(runWith([failed]), failed)

    expect(await screen.findByText("Outcome")).toBeTruthy()
    expect(screen.getByText("Failed")).toBeTruthy()
    expect(
      screen.getByText(
        "To change the outcome, remove the encounter and record it again."
      )
    ).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Caught" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Failed" })).toBeNull()
  })

  test("shows slot 1 too", async () => {
    await renderDrawer(runWith([failed]), failed)

    expect(await screen.findByText("Route 102 · slot 1")).toBeTruthy()
  })

  test("a Failed Encounter offers Species unknown and saves a set Species", async () => {
    await renderDrawer(runWith([failed]), failed)

    fireEvent.click(await screen.findByRole("button", { name: "Change" }))

    expect(screen.getByRole("button", { name: /Species unknown/ })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: /Zigzagoon/ }))
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }))

    expect(sent()).toMatchObject({
      name: "run.correct-encounter.v1",
      args: {
        encounterId: failed.id,
        met: { species: "zigzagoon", form: "base" },
        origin: "wild",
      },
      label: "Correction",
    })
  })

  test("a Caught Encounter offers no Species unknown", async () => {
    await renderDrawer(runWith([caught]), caught)

    fireEvent.click(await screen.findByRole("button", { name: "Change" }))

    expect(screen.getByRole("button", { name: /Zigzagoon/ })).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Species unknown/ })).toBeNull()
  })

  test("Save changes sends the new origin", async () => {
    await renderDrawer(runWith([caught]), caught)

    fireEvent.click(await screen.findByRole("button", { name: "Trade" }))
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }))

    expect(sent()).toMatchObject({
      args: { encounterId: caught.id, met: caught.met, origin: "trade" },
    })
  })

  test("an origin this build does not know presses nothing and is never sent by default", async () => {
    const unknownOrigin = { ...failed, origin: null }

    await renderDrawer(runWith([unknownOrigin]), unknownOrigin)

    const save = await screen.findByRole("button", { name: "Save changes" })

    expect(toggle("Wild").getAttribute("aria-pressed")).toBe("false")
    expect(screen.getByText("Select how you got it.")).toBeTruthy()
    expect(save.hasAttribute("disabled")).toBe(true)

    fireEvent.click(toggle("Gift"))
    fireEvent.click(save)

    expect(sent()).toMatchObject({ args: { origin: "gift" } })
  })

  test("Remove encounter asks first, naming the Pokémon that goes with it", async () => {
    await renderDrawer(runWith([caught]), caught)

    fireEvent.click(
      await screen.findByRole("button", { name: "Remove encounter" })
    )

    const dialog = await screen.findByRole("alertdialog")

    expect(
      within(dialog).getByText("Remove the encounter at Route 102?")
    ).toBeTruthy()
    expect(dialog.textContent).toContain("Mimi goes with it")
    expect(dialog.textContent).toContain("The slot is empty again.")
    expect(dialog.textContent).toContain(
      "For a wrong location, slot, or outcome, remove it and record the encounter again."
    )
    expect(change).not.toHaveBeenCalled()

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Remove encounter" })
    )

    expect(sent()).toMatchObject({
      name: "run.remove-encounter.v1",
      args: { encounterId: caught.id },
      label: "Encounter removal",
    })
  })

  test("Keep encounter goes back to the Drawer with the edits kept", async () => {
    await renderDrawer(runWith([caught]), caught)

    fireEvent.click(await screen.findByRole("button", { name: "Trade" }))
    fireEvent.click(screen.getByRole("button", { name: "Remove encounter" }))
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Keep encounter",
      })
    )

    expect(change).not.toHaveBeenCalled()
    expect(toggle("Trade").getAttribute("aria-pressed")).toBe("true")
  })

  test("closes when the Encounter is gone", async () => {
    const view = await renderDrawer(runWith([caught]), caught)

    expect(await screen.findByText("Route 102 · slot 2")).toBeTruthy()
    expect(screen.getByRole("dialog")).toBeTruthy()

    mockRun(runWith([]))
    view.rerender(
      <Suspense fallback={null}>
        <Harness encounterId={caught.id} />
      </Suspense>
    )

    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })
})
