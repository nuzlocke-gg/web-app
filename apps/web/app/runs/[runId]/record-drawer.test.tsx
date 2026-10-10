import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { loadMap } from "@workspace/game-data"
import { toast } from "@workspace/ui/components/toast"
import { Suspense } from "react"
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest"

import type { RunState } from "@/lib/runs/state"
import { journeyWithPokemon, runState } from "@/test/run-state"

import { RecordDrawer } from "./record-drawer"
import { useRun } from "./run-root"

// The real root needs the Server Action; the Drawer needs only the Run and
// `mutate`.
vi.mock("./run-root", () => ({ useRun: vi.fn() }))

type Listeners = { onAcceptance: (result: unknown) => void }

const mutate = vi.fn<(invocation: unknown, listeners: Listeners) => unknown>(
  () => ({ ok: true, value: {} })
)
const onOpenChange = vi.fn()
const addToast = vi.spyOn(toast, "add")

// The first load of the Map takes longer than a query waits.
beforeAll(() => loadMap("emerald"))

afterEach(() => {
  cleanup()
  mutate.mockClear()
  onOpenChange.mockClear()
  addToast.mockClear()
})

async function renderDrawer(run: RunState) {
  vi.mocked(useRun).mockReturnValue({ value: run, mutate } as never)

  await act(async () => {
    render(
      <Suspense fallback={null}>
        <RecordDrawer
          placeId="starter"
          placeName="Starter"
          slot={1}
          open
          onOpenChange={onOpenChange}
        />
      </Suspense>
    )
  })
}

function toggle(name: string) {
  return screen.getByRole("button", { name })
}

describe("RecordDrawer", () => {
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

  test("Save encounter records the details with the nickname trimmed", async () => {
    await renderDrawer(runState())

    fireEvent.click(await screen.findByRole("button", { name: /Mudkip/ }))
    fireEvent.change(screen.getByLabelText("Nickname"), {
      target: { value: "  Muddy " },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save encounter" }))

    expect(mutate).toHaveBeenCalledWith(
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
      expect.anything()
    )
  })

  test("a refused prediction closes the Drawer and says why in a toast", async () => {
    mutate.mockReturnValueOnce({ ok: false, error: { kind: "slot-taken" } })
    await renderDrawer(runState())

    fireEvent.click(await screen.findByRole("button", { name: /Mudkip/ }))
    fireEvent.click(screen.getByRole("button", { name: "Save encounter" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(addToast).toHaveBeenCalledWith({
      type: "error",
      title: "Encounter not saved",
      description: "You already have an encounter in this slot.",
    })
  })

  test("a refusal from the server says why in a toast", async () => {
    await renderDrawer(runState())

    fireEvent.click(await screen.findByRole("button", { name: /Mudkip/ }))
    fireEvent.click(screen.getByRole("button", { name: "Save encounter" }))

    expect(addToast).not.toHaveBeenCalled()

    const [, listeners] = mutate.mock.calls[0]!

    listeners.onAcceptance({
      ok: false,
      error: { kind: "domain", error: { kind: "unknown-entry" } },
    })

    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Encounter not saved",
        description: "Your game does not have this species or location.",
      })
    )
  })

  test("a prediction withdrawn over newer canon says why in a toast", async () => {
    await renderDrawer(runState())

    fireEvent.click(await screen.findByRole("button", { name: /Mudkip/ }))
    fireEvent.click(screen.getByRole("button", { name: "Save encounter" }))

    const [, listeners] = mutate.mock.calls[0]!

    listeners.onAcceptance({
      ok: false,
      error: { kind: "replay-refused", error: { kind: "slot-taken" } },
    })

    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Encounter not saved",
        description: "You already have an encounter in this slot.",
      })
    )
  })
})
