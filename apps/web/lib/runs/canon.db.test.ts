import { eq } from "drizzle-orm"
import { describe, expect, test, vi } from "vitest"

import { db } from "@/lib/db"
import { runs } from "@/lib/db/schema"
import { makeRun } from "@/test/runs"
import { signIn, signOut } from "@/test/session"

import { loadRunCanon } from "./canon"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  refresh: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}))

describe("loadRunCanon", () => {
  test("a Player of the Run gets its canon", async () => {
    await signIn()
    const runId = await makeRun()

    await expect(loadRunCanon(runId)).resolves.not.toBeNull()
  })

  test("another Player gets no canon", async () => {
    await signIn()
    const runId = await makeRun()

    await signIn({ displayName: "Misty" })

    await expect(loadRunCanon(runId)).resolves.toBeNull()
  })

  test("a visitor who is not signed in gets no canon", async () => {
    await signIn()
    const runId = await makeRun()

    signOut()

    await expect(loadRunCanon(runId)).resolves.toBeNull()
  })

  test.each([
    ["an unknown Run id", "6f1c2b8e-3d4a-4f5b-9c6d-7e8f9a0b1c2d"],
    ["a malformed Run id", "not-a-run"],
  ])("%s gets no canon", async (_, runId) => {
    await signIn()

    await expect(loadRunCanon(runId)).resolves.toBeNull()
  })

  test("a made Run records when it started and last changed", async () => {
    await signIn()
    const runId = await makeRun()

    const [run] = await db
      .select({ startedAt: runs.startedAt, lastChangedAt: runs.lastChangedAt })
      .from(runs)
      .where(eq(runs.id, runId))

    expect(run?.startedAt).toBeInstanceOf(Date)
    expect(run?.lastChangedAt).toEqual(run?.startedAt)
  })
})
