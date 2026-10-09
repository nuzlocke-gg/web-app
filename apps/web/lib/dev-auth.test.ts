import { describe, expect, test } from "vitest"

import { isDevAuthAvailable } from "./dev-auth"

const local = { NODE_ENV: "development", DEV_AUTH_EMAIL: "dev@example.test" }

describe("isDevAuthAvailable", () => {
  test.each(["localhost:3000", "127.0.0.1:3000", "[::1]:3000", "localhost"])(
    "is on in local development at %s",
    (host) => {
      expect(isDevAuthAvailable(host, local)).toBe(true)
    }
  )

  test.each([
    ["a production build", { ...local, NODE_ENV: "production" }, "localhost"],
    ["no DEV_AUTH_EMAIL", { ...local, DEV_AUTH_EMAIL: "" }, "localhost"],
    ["a remote host", local, "nuzlocke.gg"],
    ["a host that starts with localhost", local, "localhost.evil.test"],
    ["no host", local, null],
  ])("is off for %s", (_case, env, host) => {
    expect(isDevAuthAvailable(host, env)).toBe(false)
  })
})
