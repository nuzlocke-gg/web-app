import { afterEach, describe, expect, test, vi } from "vitest"

import { runAuthority } from "@/lib/runs/binder"

import { GET } from "./route"

vi.mock("@/lib/runs/binder", () => ({
  runAuthority: { deleteExpiredReceipts: vi.fn() },
}))

const deleteExpiredReceipts = vi.mocked(runAuthority.deleteExpiredReceipts)

function cronRequest(authorization?: string) {
  return new Request("http://localhost/api/cron/delete-expired-receipts", {
    headers: authorization ? { authorization } : {},
  })
}

afterEach(() => {
  vi.unstubAllEnvs()
  deleteExpiredReceipts.mockReset()
})

describe("GET /api/cron/delete-expired-receipts", () => {
  test.each([
    ["no Authorization header", undefined],
    ["a wrong secret", "Bearer wrong"],
  ])("answers 401 to %s and deletes nothing", async (_, authorization) => {
    vi.stubEnv("CRON_SECRET", "secret")

    const response = await GET(cronRequest(authorization))

    expect(response.status).toBe(401)
    expect(deleteExpiredReceipts).not.toHaveBeenCalled()
  })

  test("answers 401 when no CRON_SECRET is set", async () => {
    vi.stubEnv("CRON_SECRET", "")

    const response = await GET(cronRequest("Bearer "))

    expect(response.status).toBe(401)
  })

  test("deletes in batches until a batch is not full", async () => {
    vi.stubEnv("CRON_SECRET", "secret")
    deleteExpiredReceipts.mockResolvedValueOnce(1000).mockResolvedValueOnce(3)

    const response = await GET(cronRequest("Bearer secret"))

    expect(deleteExpiredReceipts).toHaveBeenCalledTimes(2)
    await expect(response.json()).resolves.toEqual({ deleted: 1003 })
  })
})
