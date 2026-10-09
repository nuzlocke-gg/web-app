// @vitest-environment node
import { NextRequest } from "next/server"
import { describe, expect, test, vi } from "vitest"

vi.stubEnv("AUTH_SECRET", "unit-test-only-secret")

const { GET } = await import("./route")

async function callbackUrlFor(headers: Record<string, string>) {
  const response = await GET(
    new NextRequest("http://localhost:3000/api/auth/providers", { headers })
  )
  const providers = await response.json()

  return providers.google.callbackUrl
}

describe("the Auth.js route outside production", () => {
  test("keeps the forwarded host of a proxy", async () => {
    await expect(
      callbackUrlFor({ "x-forwarded-host": "box.tail0000.ts.net" })
    ).resolves.toBe("http://box.tail0000.ts.net/api/auth/callback/google")
  })

  test("stays on localhost without a proxy", async () => {
    await expect(
      callbackUrlFor({ "x-forwarded-host": "localhost:3000" })
    ).resolves.toBe("http://localhost:3000/api/auth/callback/google")
  })
})
