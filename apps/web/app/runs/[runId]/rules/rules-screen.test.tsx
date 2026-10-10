import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { setRules } from "@/lib/runs/mutations"
import { defaultRules } from "@/lib/runs/rules"
import type { RunState } from "@/lib/runs/state"
import { runState } from "@/test/run-state"

import { useRun, useRunChange } from "../run-root"
import { RulesScreen } from "./rules-screen"
import { useSetHouseRules } from "./use-set-house-rules"

// The real root and the House rules action need the Server Actions; the
// screen needs only the Run, the function that sends a change, and the save.
vi.mock("../run-root", () => ({ useRun: vi.fn(), useRunChange: vi.fn() }))
vi.mock("./use-set-house-rules", () => ({ useSetHouseRules: vi.fn() }))

const push = vi.fn()

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))

const change = vi.fn<(invocation: unknown, label: string) => void>()
const saveHouseRules = vi.fn(async () => ({ ok: true, value: undefined }))

afterEach(() => {
  cleanup()
  change.mockClear()
  saveHouseRules.mockClear()
  push.mockClear()
})

async function renderRules(
  overrides: Partial<RunState> = {},
  saving: { pending?: unknown; status?: string } = {}
) {
  const run = runState({ rules: defaultRules(), ...overrides })

  vi.mocked(useRun).mockReturnValue({ value: run } as never)
  vi.mocked(useRunChange).mockReturnValue(change)
  vi.mocked(useSetHouseRules).mockReturnValue({
    run: saveHouseRules,
    retry: vi.fn(),
    pending: undefined,
    status: "idle",
    ...saving,
  } as never)

  await act(async () => render(<RulesScreen />))

  return run
}

describe("the Rules screen", () => {
  test("a switch sends only the Rule it changed", async () => {
    const run = await renderRules()

    fireEvent.click(screen.getByRole("switch", { name: "Duplicate Clause" }))

    expect(change).toHaveBeenCalledWith(
      setRules({ runId: run.id, rules: { "duplicate-clause": true } }),
      "Rules"
    )
  })

  test("a solo Run shows the Rules with their descriptions and no Soul Link group", async () => {
    await renderRules()

    expect(
      screen.getByRole("heading", { name: "Rules", level: 1 })
    ).toBeDefined()
    expect(
      screen.getByText("You must give each Pokémon a nickname.")
    ).toBeDefined()
    expect(screen.getAllByRole("switch")).toHaveLength(4)
    expect(screen.queryByText("Soul Link rules")).toBeNull()
  })

  test("a Soul Link shows the Soul Link rules in a group of their own", async () => {
    await renderRules({ kind: "soul_link" })

    const group = screen.getByRole("region", { name: "Soul Link rules" })

    expect(within(group).getAllByRole("switch")).toHaveLength(5)
  })

  test("a finished Run shows its Rules as a record and keeps House rules editable", async () => {
    await renderRules({ state: "failed" })

    expect(
      screen.getByRole("heading", { name: "Rules", level: 1 })
    ).toBeDefined()
    expect(screen.getByRole("status").textContent).toContain(
      "This run is finished"
    )
    expect(
      screen
        .getAllByRole("switch")
        .every((element) => element.getAttribute("aria-disabled") === "true")
    ).toBe(true)
    expect(
      (screen.getByLabelText("House rules") as HTMLTextAreaElement).disabled
    ).toBe(false)
  })

  test("Save sends the House rules as typed", async () => {
    const run = await renderRules()

    fireEvent.change(screen.getByLabelText("House rules"), {
      target: { value: "Level caps\n  Roxanne 15" },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }))
    })

    expect(saveHouseRules).toHaveBeenCalledWith({
      runId: run.id,
      houseRules: "Level caps\n  Roxanne 15",
    })
  })

  test("Back with unsaved House rules asks to discard them", async () => {
    const run = await renderRules()

    fireEvent.change(screen.getByLabelText("House rules"), {
      target: { value: "Set mode" },
    })
    fireEvent.click(screen.getByRole("link", { name: "Back to the run" }))

    const dialog = await screen.findByRole("alertdialog", {
      name: "Discard your changes to the house rules?",
    })

    expect(push).not.toHaveBeenCalled()

    fireEvent.click(within(dialog).getByRole("button", { name: "Discard" }))

    expect(push).toHaveBeenCalledWith(`/runs/${run.id}`)
  })

  test("Back with no unsaved text leaves at once", async () => {
    await renderRules({ houseRules: "Set mode" })

    fireEvent.click(screen.getByRole("link", { name: "Back to the run" }))

    expect(screen.queryByRole("alertdialog")).toBeNull()
  })

  test("Back with an unconfirmed save asks first, because only this screen can retry it", async () => {
    await renderRules(
      {},
      {
        pending: { args: { houseRules: "Set mode" } },
        status: "unconfirmed",
      }
    )

    expect(
      screen.getByText("Not saved yet. Your house rules are kept here.")
    ).toBeDefined()

    fireEvent.click(screen.getByRole("link", { name: "Back to the run" }))

    expect(
      await screen.findByRole("alertdialog", {
        name: "Discard your changes to the house rules?",
      })
    ).toBeDefined()
  })
})
