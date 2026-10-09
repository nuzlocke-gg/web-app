import { describe, expect, test } from "vitest"

import { parseDisplayName } from "./display-name"

describe("parseDisplayName", () => {
  test("trims the name", () => {
    expect(parseDisplayName("  Ash Ketchum  ")).toEqual({
      ok: true,
      value: "Ash Ketchum",
    })
  })

  test.each(["", "   ", "\n\t", null, undefined])(
    "refuses an empty name (%j)",
    (raw) => {
      expect(parseDisplayName(raw)).toEqual({ ok: false, error: "empty" })
    }
  )

  test("accepts 30 characters of any Unicode, counted as code points", () => {
    const name = "🐉".repeat(10) + "Ünï".repeat(6) + "ab"

    expect([...name]).toHaveLength(30)
    expect(parseDisplayName(name)).toEqual({ ok: true, value: name })
  })

  test("refuses 31 characters", () => {
    expect(parseDisplayName("a".repeat(31))).toEqual({
      ok: false,
      error: "too-long",
    })
  })
})
