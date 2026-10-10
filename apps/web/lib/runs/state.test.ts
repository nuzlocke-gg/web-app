import { ORIGINS } from "@workspace/game-data"
import { describe, expect, test } from "vitest"

import { encounterOutcomes, parseKnown, runKinds, runLifeStates } from "./state"

describe("parseKnown", () => {
  test.each([
    [runKinds, "soul_link"],
    [runLifeStates, "active"],
    [ORIGINS, "trade"],
    [encounterOutcomes, "failed"],
  ] as const)("keeps a value this build knows: %s %s", (values, stored) => {
    expect(parseKnown(values, stored)).toBe(stored)
  })

  test.each([
    [runKinds, "relay"],
    [runLifeStates, "paused"],
    [ORIGINS, "event"],
    [encounterOutcomes, "fled"],
  ] as const)(
    "reads a value from a newer build as unknown: %s %s",
    (values, stored) => {
      expect(parseKnown(values, stored)).toBeNull()
    }
  )

  test("reads an Object property name as unknown", () => {
    expect(parseKnown(runKinds, "toString")).toBeNull()
  })
})
