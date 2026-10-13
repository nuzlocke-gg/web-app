import { v7 as uuidv7 } from "uuid"
import { describe, expect, test } from "vitest"

import {
  customPlaceState,
  deepFrozen,
  encounterState,
  journeyState,
  runState,
} from "@/test/run-state"

import { removeCustomPlace } from "../mutations"
import type { RunLifeState, RunState } from "../state"
import type { RemoveCustomPlaceArgs } from "./remove-custom-place"

const linkTrade = customPlaceState({ name: "Link trade" })
const partnerId = "0199c4a0-0000-7000-8000-000000000009"

function remove(run: RunState, id = linkTrade.id): RemoveCustomPlaceArgs {
  return { runId: run.id, customPlaceId: id }
}

function predict(run: RunState, args: RemoveCustomPlaceArgs) {
  return removeCustomPlace.predict(run, args, { mutationId: uuidv7() })
}

describe("Remove a Custom Place", () => {
  test("removes a Custom Place with no Encounter", () => {
    const run = deepFrozen(runState({ customPlaces: [linkTrade] }))

    expect(predict(run, remove(run))).toEqual({
      ok: true,
      value: { ...run, customPlaces: [] },
    })
  })

  test("a Custom Place where a partner has an Encounter is refused as custom-place-in-use", () => {
    const run = runState({
      kind: "soul_link",
      customPlaces: [linkTrade],
      journeys: [
        journeyState(),
        journeyState({
          id: uuidv7(),
          playerId: partnerId,
          encounters: [
            encounterState({ place: { kind: "custom", id: linkTrade.id } }),
          ],
        }),
      ],
    })

    expect(predict(run, remove(run))).toEqual({
      ok: false,
      error: { kind: "custom-place-in-use" },
    })
  })

  test("a Custom Place that is gone is refused as gone", () => {
    const run = runState()

    expect(predict(run, remove(run))).toEqual({
      ok: false,
      error: { kind: "gone" },
    })
  })

  test.each<RunLifeState>(["waiting", "failed", "complete"])(
    "a %s Run is refused as run-not-active",
    (state) => {
      const run = runState({ state, customPlaces: [linkTrade] })

      expect(predict(run, remove(run))).toEqual({
        ok: false,
        error: { kind: "run-not-active" },
      })
    }
  )
})
