import { describe, expect, test } from "vitest"

import { houseRules, houseRulesOf, houseRulesRefusal } from "./house-rules"

describe("House rules", () => {
  test("keep line breaks and indentation as typed", () => {
    const text = "Level cap:\n  - Roxanne 15\n\nSet mode\n"

    expect(houseRulesOf(text)).toBe(text)
    expect(houseRules.parse(text)).toBe(text)
  })

  test("a blank field is none", () => {
    expect(houseRulesOf(" \n\t")).toBeNull()
    expect(houseRules.safeParse(" \n").success).toBe(false)
    expect(houseRules.parse(null)).toBeNull()
  })

  test("count code points, as the database does", () => {
    const atLimit = "🐉".repeat(2000)

    expect(houseRulesRefusal(atLimit)).toBeNull()
    expect(houseRules.safeParse(atLimit).success).toBe(true)
    expect(houseRulesRefusal(`${atLimit}a`)).toBe("too-long")
    expect(houseRules.safeParse(`${atLimit}a`).success).toBe(false)
  })
})
