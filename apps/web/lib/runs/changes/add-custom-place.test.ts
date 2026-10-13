import { v7 as uuidv7 } from "uuid"
import { describe, expect, test } from "vitest"

import { customPlaceState, deepFrozen, runState } from "@/test/run-state"

import { addCustomPlace } from "../mutations"
import type { RunLifeState, RunState } from "../state"
import { addCustomPlaceArgs, type AddCustomPlaceArgs } from "./add-custom-place"

const linkTrade = customPlaceState({ name: "Link trade" })

function add(run: RunState, name: string): AddCustomPlaceArgs {
  return { runId: run.id, customPlaceId: uuidv7(), name }
}

function predict(run: RunState, args: AddCustomPlaceArgs) {
  return addCustomPlace.predict(run, args, { mutationId: uuidv7() })
}

describe("Add a Custom Place", () => {
  test("adds the Custom Place to the Run", () => {
    const run = deepFrozen(runState())
    const args = add(run, "Link trade")

    expect(predict(run, args)).toEqual({
      ok: true,
      value: {
        ...run,
        customPlaces: [{ id: args.customPlaceId, name: "Link trade" }],
      },
    })
  })

  test("keeps the Custom Places in the order they were added", () => {
    const run = runState({ customPlaces: [linkTrade] })
    const args = add(run, "Bonus disc")
    const result = predict(run, args)

    expect(result.ok && result.value.customPlaces.map((c) => c.name)).toEqual([
      "Link trade",
      "Bonus disc",
    ])
  })

  test.each(["Link trade", "LINK TRADE", "link trade"])(
    "refuses %j, a name the Run has in any letter case, as custom-place-name-taken",
    (name) => {
      const run = runState({ customPlaces: [linkTrade] })

      expect(predict(run, add(run, name))).toEqual({
        ok: false,
        error: { kind: "custom-place-name-taken" },
      })
    }
  )

  test.each<RunLifeState>(["waiting", "failed", "complete"])(
    "a %s Run is refused as run-not-active",
    (state) => {
      const run = runState({ state })

      expect(predict(run, add(run, "Link trade"))).toEqual({
        ok: false,
        error: { kind: "run-not-active" },
      })
    }
  )

  test.each([
    ["an empty name", ""],
    ["a name with surrounding spaces", " Link trade "],
    ["a name of 41 characters", "x".repeat(41)],
  ])("the args refuse %s", (_, name) => {
    expect(addCustomPlaceArgs.safeParse(add(runState(), name)).success).toBe(
      false
    )
  })

  test("the args take a name of 40 characters", () => {
    const args = add(runState(), "é".repeat(40))

    expect(addCustomPlaceArgs.safeParse(args).success).toBe(true)
  })
})
