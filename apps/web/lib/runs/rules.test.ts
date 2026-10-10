import { describe, expect, test } from "vitest"

import { defaultRules, rulesOn, rulesShown } from "./rules"

describe("rules", () => {
  test("a new Run writes all nine Rules explicitly", () => {
    expect(Object.keys(defaultRules())).toHaveLength(9)
  })

  test("a solo Run shows four Rules, two of them on by default", () => {
    expect(rulesShown("solo").map((rule) => rule.name)).toEqual([
      "First Encounter Rule",
      "Nickname Clause",
      "Duplicate Clause",
      "Whiteout Rule",
    ])
    expect(rulesOn("solo", defaultRules()).map((rule) => rule.name)).toEqual([
      "First Encounter Rule",
      "Nickname Clause",
    ])
  })

  test("a Soul Link shows all nine", () => {
    expect(rulesShown("soul_link")).toHaveLength(9)
  })

  test("an absent Rule key is Off", () => {
    expect(rulesOn("solo", {})).toEqual([])
  })
})
