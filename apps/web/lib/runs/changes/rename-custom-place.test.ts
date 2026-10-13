import { unchanged } from "headcanon"
import { ok } from "serializable-result"
import { v7 as uuidv7 } from "uuid"
import { describe, expect, test } from "vitest"

import {
  customPlaceState,
  deepFrozen,
  encounterState,
  journeyState,
  runState,
} from "@/test/run-state"

import { renameCustomPlace } from "../mutations"
import type { RunLifeState, RunState } from "../state"
import { check, type RenameCustomPlaceArgs } from "./rename-custom-place"

const linkTrade = customPlaceState({ name: "Link trade" })
const bonusDisc = customPlaceState({ name: "Bonus disc" })

function runWith(overrides: Partial<RunState> = {}): RunState {
  return deepFrozen(
    runState({ customPlaces: [linkTrade, bonusDisc], ...overrides })
  )
}

function rename(run: RunState, name: string, id = linkTrade.id) {
  return { runId: run.id, customPlaceId: id, name }
}

function predict(run: RunState, args: RenameCustomPlaceArgs) {
  return renameCustomPlace.predict(run, args, { mutationId: uuidv7() })
}

function namesAfter(run: RunState, args: RenameCustomPlaceArgs): string[] {
  const result = predict(run, args)

  if (!result.ok) throw new Error(`Refused: ${result.error.kind}`)

  return result.value.customPlaces.map((custom) => custom.name)
}

describe("Rename a Custom Place", () => {
  test("sets the name", () => {
    const run = runWith()

    expect(namesAfter(run, rename(run, "Trade from Ruby"))).toEqual([
      "Trade from Ruby",
      "Bonus disc",
    ])
  })

  test("renames a Custom Place that has Encounters", () => {
    const run = runWith({
      journeys: [
        journeyState({
          encounters: [
            encounterState({ place: { kind: "custom", id: linkTrade.id } }),
          ],
        }),
      ],
    })

    expect(namesAfter(run, rename(run, "Trade from Ruby"))[0]).toBe(
      "Trade from Ruby"
    )
  })

  test("a new letter case of its own name is accepted", () => {
    const run = runWith()

    expect(namesAfter(run, rename(run, "Link Trade"))[0]).toBe("Link Trade")
  })

  test("the name it already has is a no-op", () => {
    const run = runWith()

    expect(check(run, rename(run, "Link trade"))).toEqual(ok(unchanged()))
  })

  test.each(["Bonus disc", "BONUS DISC"])(
    "refuses %j, the name of another Custom Place, as custom-place-name-taken",
    (name) => {
      const run = runWith()

      expect(predict(run, rename(run, name))).toEqual({
        ok: false,
        error: { kind: "custom-place-name-taken" },
      })
    }
  )

  test("a Custom Place that is gone is refused as gone", () => {
    const run = runWith()

    expect(predict(run, rename(run, "Link", uuidv7()))).toEqual({
      ok: false,
      error: { kind: "gone" },
    })
  })

  test.each<RunLifeState>(["waiting", "failed", "complete"])(
    "a %s Run is refused as run-not-active",
    (state) => {
      const run = runWith({ state })

      expect(predict(run, rename(run, "Link"))).toEqual({
        ok: false,
        error: { kind: "run-not-active" },
      })
    }
  )
})
