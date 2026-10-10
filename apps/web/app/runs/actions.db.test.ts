import { eq } from "drizzle-orm"
import { createOperationEnvelope } from "headcanon"
import { updateTag } from "next/cache"
import { describe, expect, test, vi } from "vitest"

import { db } from "@/lib/db"
import { journeys } from "@/lib/db/schema"
import { runAxis } from "@/lib/runs/axis"
import { loadRunCanon } from "@/lib/runs/canon"
import { createRun } from "@/lib/runs/operations"
import { redirectOf } from "@/test/redirect"
import { makeRun } from "@/test/runs"
import { signIn } from "@/test/session"

import { createRunAction } from "./actions"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
// The action expires the axis cache tag and refreshes the route, which work
// only inside a request.
vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  refresh: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}))

const emerald = {
  mapId: "emerald",
  gameId: "emerald",
  name: "Emerald Hardcore",
}

async function journeyCountOf(playerId: string) {
  const rows = await db
    .select({ id: journeys.id })
    .from(journeys)
    .where(eq(journeys.playerId, playerId))

  return rows.length
}

describe("createRunAction", () => {
  test("a made Run reads back as a solo, active, private first Attempt with the default Rules", async () => {
    const playerId = await signIn()

    const runId = await makeRun()
    const canon = await loadRunCanon(runId)

    expect(canon?.value).toEqual({
      id: runId,
      viewerId: playerId,
      name: "Emerald Hardcore",
      mapId: "emerald",
      kind: "solo",
      state: "active",
      visibility: "private",
      attemptNumber: 1,
      rules: {
        "first-encounter": true,
        "nickname-clause": true,
        "duplicate-clause": false,
        whiteout: false,
        "shared-fate": true,
        "linked-party": true,
        "complete-links": true,
        "type-restriction": false,
        "shared-duplicate-clause": false,
      },
      journeys: [
        {
          id: expect.any(String),
          playerId,
          gameId: "emerald",
          encounters: [],
          pokemon: [],
        },
      ],
    })
    expect(canon?.revisions).toEqual({ [runAxis.of(runId)]: 1 })
  })

  test("the commit expires the new Run's axis", async () => {
    await signIn()
    vi.mocked(updateTag).mockClear()

    await makeRun()

    expect(updateTag).toHaveBeenCalledOnce()
  })

  test("one submission delivered twice makes one Run and answers with it both times", async () => {
    const playerId = await signIn()
    const envelope = createOperationEnvelope(createRun, emerald)

    const first = await createRunAction(envelope)
    const second = await createRunAction(envelope)

    expect(second).toEqual(first)
    await expect(journeyCountOf(playerId)).resolves.toBe(1)
  })

  test("a submission's id with other arguments is refused and makes nothing", async () => {
    const playerId = await signIn()
    const envelope = createOperationEnvelope(createRun, emerald)
    await createRunAction(envelope)

    const reused = await createRunAction({
      ...envelope,
      invocation: {
        ...envelope.invocation,
        args: { ...emerald, name: "Ruby" },
      },
    })

    expect(reused).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: "mutation-id-reused" }),
      })
    )
    await expect(journeyCountOf(playerId)).resolves.toBe(1)
  })

  test("a tombstoned actor goes to sign-in and makes no Run", async () => {
    const playerId = await signIn({ tombstone: true })

    await expect(
      redirectOf(createRunAction(createOperationEnvelope(createRun, emerald)))
    ).resolves.toBe("/sign-in")
    await expect(journeyCountOf(playerId)).resolves.toBe(0)
  })

  test.each([
    ["an empty name", ""],
    ["a name with spaces around it", " Emerald "],
    ["a 61-character name", "a".repeat(61)],
  ])("%s is refused at the envelope and makes no Run", async (_, name) => {
    const playerId = await signIn()

    const outcome = await createRunAction(
      createOperationEnvelope(createRun, { ...emerald, name })
    )

    expect(outcome).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: "invalid-arguments" }),
      })
    )
    await expect(journeyCountOf(playerId)).resolves.toBe(0)
  })

  test.each([
    ["an unknown Map", { mapId: "kanto", gameId: "emerald" }],
    ["a Game outside the Map", { mapId: "emerald", gameId: "ruby" }],
  ])("%s is refused as unknown-game", async (_, place) => {
    const playerId = await signIn()

    const outcome = await createRunAction(
      createOperationEnvelope(createRun, { ...emerald, ...place })
    )

    expect(outcome).toEqual(
      expect.objectContaining({
        ok: true,
        value: expect.objectContaining({
          kind: "refused",
          error: "unknown-game",
        }),
      })
    )
    await expect(journeyCountOf(playerId)).resolves.toBe(0)
  })
})
