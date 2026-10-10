import { describe, expect, test } from "vitest"

import { nickname, nicknameRefusal } from "./nickname"

describe("nickname", () => {
  test("counts code points, so 12 emoji fit and 13 letters do not", () => {
    expect(nicknameRefusal("🐉".repeat(12))).toBeNull()
    expect(nicknameRefusal("a".repeat(13))).toBe("too-long")
  })

  test.each(["", " Muddy", "Muddy ", "a".repeat(13)])(
    "the schema refuses %j",
    (value) => {
      expect(nickname.safeParse(value).success).toBe(false)
    }
  )

  test("the schema admits a trimmed nickname as it is", () => {
    expect(nickname.parse("Muddy")).toBe("Muddy")
  })
})
