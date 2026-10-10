import { describe, expect, test } from "vitest"

import { runName, runNameRefusal } from "./run-name"

describe("Run names", () => {
  test.each([
    ["", "empty"],
    ["a".repeat(61), "too-long"],
    ["a".repeat(60), null],
    ["🐉".repeat(60), null],
  ])("%j is %s", (name, refusal) => {
    expect(runNameRefusal(name)).toBe(refusal)
  })

  test("the arguments schema refuses a name with spaces around it, which the form trims first", () => {
    expect(runName.safeParse(" Emerald ").success).toBe(false)
    expect(runName.safeParse("Emerald").success).toBe(true)
  })
})
