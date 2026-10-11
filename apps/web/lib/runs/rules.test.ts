import { describe, expect, test } from "vitest"

import {
  defaultRules,
  newRunRules,
  ruleChanges,
  rulePatch,
  rulesOn,
  rulesShown,
} from "./rules"

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

  test("every Rule has a one-sentence description", () => {
    expect(rulesShown("soul_link").every((rule) => rule.description)).toBe(true)
  })
})

describe("ruleChanges", () => {
  test("gives only the Rules whose value changes", () => {
    expect(
      ruleChanges(defaultRules(), {
        "first-encounter": true,
        whiteout: true,
      })
    ).toEqual({ whiteout: true })
  })

  test("a value already set changes nothing", () => {
    expect(ruleChanges(defaultRules(), { "nickname-clause": true })).toEqual({})
  })

  test("an absent key is Off, so setting it Off changes nothing", () => {
    expect(ruleChanges({}, { whiteout: false })).toEqual({})
  })

  test("the Shared Duplicate Clause going on turns the Duplicate Clause on", () => {
    expect(
      ruleChanges(defaultRules(), { "shared-duplicate-clause": true })
    ).toEqual({ "shared-duplicate-clause": true, "duplicate-clause": true })
  })

  test("the Duplicate Clause going off turns the shared one off", () => {
    const current = {
      ...defaultRules(),
      "duplicate-clause": true,
      "shared-duplicate-clause": true,
    }

    expect(ruleChanges(current, { "duplicate-clause": false })).toEqual({
      "duplicate-clause": false,
      "shared-duplicate-clause": false,
    })
  })

  test("a patch that asks for both leaves both Off", () => {
    const current = { ...defaultRules(), "duplicate-clause": true }

    expect(
      ruleChanges(current, {
        "duplicate-clause": false,
        "shared-duplicate-clause": true,
      })
    ).toEqual({ "duplicate-clause": false })
  })
})

describe("newRunRules", () => {
  test("writes every Rule, at its default unless chosen", () => {
    expect(newRunRules({ "duplicate-clause": true })).toEqual({
      ...defaultRules(),
      "duplicate-clause": true,
    })
  })

  test("normalizes the Duplicate Clause dependency", () => {
    expect(
      newRunRules({ "shared-duplicate-clause": true })["duplicate-clause"]
    ).toBe(true)
  })
})

describe("rulePatch", () => {
  test("accepts known Rules", () => {
    expect(rulePatch.safeParse({ whiteout: true }).success).toBe(true)
  })

  test("refuses an empty patch and an unknown Rule", () => {
    expect(rulePatch.safeParse({}).success).toBe(false)
    expect(rulePatch.safeParse({ "level-cap": true }).success).toBe(false)
  })
})
