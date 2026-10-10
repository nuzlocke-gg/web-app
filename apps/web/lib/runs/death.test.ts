import { describe, expect, test } from "vitest"

import { deathCause, deathCauseRefusal, typedDeathLevel } from "./death"

describe("typedDeathLevel", () => {
  const typed = (value: string, badInput = false) =>
    typedDeathLevel({ value, badInput }, 100)
  const outOfRange = { level: null, problem: "Use a level from 1 to 100." }

  test("an empty field is no level", () => {
    expect(typed("")).toEqual({ level: null, problem: null })
  })

  test.each(["1", "24", "100"])("reads %s", (value) => {
    expect(typed(value)).toEqual({ level: Number(value), problem: null })
  })

  test.each(["0", "101", "2.5", "-3", "1e2"])("refuses %s", (value) => {
    expect(typed(value)).toEqual(outOfRange)
  })

  test("refuses text the browser cannot read as a number", () => {
    expect(typed("", true)).toEqual(outOfRange)
  })

  test("takes the Map's highest level", () => {
    expect(typedDeathLevel({ value: "250", badInput: false }, 255)).toEqual({
      level: 250,
      problem: null,
    })
  })
})

describe("a cause of death", () => {
  test("counts code points, as the database CHECK does", () => {
    expect(deathCauseRefusal("🐉".repeat(140))).toBeNull()
    expect(deathCauseRefusal("🐉".repeat(141))).toBe("too-long")
    expect(deathCause.safeParse("🐉".repeat(140)).success).toBe(true)
  })
})
