import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { toast } from "@workspace/ui/components/toast"
import { defineCanon } from "headcanon"
import { UnrecognizedActionError } from "next/dist/client/components/unrecognized-action-error"
import { v7 as uuidv7 } from "uuid"
import { afterEach, describe, expect, test, vi } from "vitest"

import { runAxis } from "@/lib/runs/axis"
import { recordEncounter } from "@/lib/runs/mutations"
import type { RunState } from "@/lib/runs/state"
import { runState, viewerId } from "@/test/run-state"

import { runAction } from "../actions"
import { RunRoot, useRun, useRunChange } from "./run-root"

vi.mock("../actions", () => ({ runAction: vi.fn() }))

const refresh = vi.fn()

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ refresh }),
}))

const action = vi.mocked(runAction)
const addToast = vi.spyOn(toast, "add")
const closeToast = vi.spyOn(toast, "close")

afterEach(() => {
  cleanup()
  action.mockReset()
  refresh.mockClear()
  addToast.mockClear()
  closeToast.mockClear()
  sessionStorage.clear()
})

/** Record an Encounter: a Caught Mudkip at the Starter location, Slot 1. */
function recordMudkip(runId: string) {
  return recordEncounter({
    runId,
    encounterId: uuidv7(),
    placeId: "starter",
    slot: 1,
    origin: "gift",
    enteredAt: Date.now(),
    outcome: {
      kind: "caught",
      met: { species: "mudkip", form: "base" },
      pokemonId: uuidv7(),
      goesTo: "party",
    },
  })
}

function canonOf(run: RunState) {
  return defineCanon({ value: run, revisions: { [runAxis.of(run.id)]: 1 } })
}

/** A screen of the Run with one button that records a Mudkip. */
function RecordButton() {
  const { value: run } = useRun()
  const change = useRunChange()

  return (
    <button
      type="button"
      onClick={() => change(recordMudkip(run.id), "Encounter")}
    >
      Record
    </button>
  )
}

// A Run root's queue outlives it, keyed by Player and Run, so each test gets
// a Run of its own.
function freshRun(overrides: Partial<RunState> = {}) {
  return runState({ id: crypto.randomUUID(), ...overrides })
}

async function renderRun(run = freshRun()) {
  await act(async () => {
    render(
      <RunRoot canon={canonOf(run)}>
        <RecordButton />
      </RunRoot>
    )
  })
}

async function record() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Record" }))
  })
}

function refusedOutcome(kind: string) {
  return { ok: true, value: { kind: "refused", error: { kind } } } as never
}

describe("RunRoot", () => {
  test("a refused prediction names the change and its reason, then refreshes", async () => {
    await renderRun(freshRun({ state: "failed" }))

    await record()

    expect(action).not.toHaveBeenCalled()
    expect(addToast).toHaveBeenCalledWith({
      type: "error",
      title: "Encounter not saved",
      description: "This run is not active.",
    })
    expect(refresh).toHaveBeenCalled()
  })

  test("a refusal from the server names the change and its reason, then refreshes", async () => {
    action.mockResolvedValue(refusedOutcome("slot-taken"))
    await renderRun()

    await record()

    expect(addToast).toHaveBeenCalledWith({
      type: "error",
      title: "Encounter not saved",
      description: "You already have an encounter in this slot.",
    })
    expect(refresh).toHaveBeenCalled()
  })

  test("an unknown action shows a persistent out-of-date toast and never refreshes", async () => {
    action.mockRejectedValue(new UnrecognizedActionError("Server Action"))
    await renderRun()

    await record()

    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Encounter could not be confirmed" })
    )
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout: 0,
        title: "Your app is out of date. Refresh?",
        actionProps: expect.objectContaining({ children: "Refresh" }),
      })
    )
    expect(refresh).not.toHaveBeenCalled()
  })

  test("an unknown outcome shows a persistent Not saved yet toast, and Retry sends again", async () => {
    action.mockRejectedValueOnce(new Error("network"))
    await renderRun()

    await record()

    expect(addToast).toHaveBeenCalledOnce()

    const [notSaved] = addToast.mock.calls[0]!

    expect(notSaved).toMatchObject({
      timeout: 0,
      title: "Not saved yet. Your changes are kept here.",
      actionProps: { children: "Retry" },
    })

    action.mockReturnValueOnce(new Promise(() => {}))
    await act(async () => {
      notSaved.actionProps!.onClick!({} as never)
    })

    expect(action).toHaveBeenCalledTimes(2)
    expect(closeToast).toHaveBeenCalledWith(notSaved.id)
  })

  test("asks before the page unloads while a change is unsent", async () => {
    action.mockReturnValue(new Promise(() => {}))
    await renderRun()

    expect(window.dispatchEvent(unloadEvent())).toBe(true)

    await record()

    expect(window.dispatchEvent(unloadEvent())).toBe(false)
  })

  test("a restored change that the server refuses says it was not saved", async () => {
    const run = freshRun()
    const stored = {
      protocol: "run.v1",
      scope: viewerId,
      mutationId: crypto.randomUUID(),
      createdAt: Date.now(),
      invocation: recordMudkip(run.id),
    }

    sessionStorage.setItem(
      `run-queue:${viewerId}:${run.id}`,
      JSON.stringify([stored])
    )
    action.mockResolvedValue(refusedOutcome("run-not-active"))

    await renderRun(run)
    await act(async () => {})

    expect(action).toHaveBeenCalledOnce()
    expect(addToast).toHaveBeenCalledWith({
      type: "error",
      title: "A change made before the page reloaded was not saved.",
      description: "This run is not active.",
    })
  })
})

/** A cancelable `beforeunload`; a listener that asks cancels it. */
function unloadEvent() {
  return new Event("beforeunload", { cancelable: true })
}
