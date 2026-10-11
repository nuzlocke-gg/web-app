import { unchanged } from "headcanon"
import { ok } from "serializable-result"
import { v7 as uuidv7 } from "uuid"
import { describe, expect, test } from "vitest"

import { deepFrozen, runState } from "@/test/run-state"

import { setRules } from "../mutations"
import { defaultRules } from "../rules"
import type { RunLifeState, RunState } from "../state"
import { check, type SetRulesArgs } from "./set-rules"

function predict(run: RunState, args: SetRulesArgs) {
  return setRules.predict(run, args, { mutationId: uuidv7() })
}

function predicted(run: RunState, args: SetRulesArgs): RunState {
  const result = predict(run, args)

  if (!result.ok) throw new Error(`Refused: ${result.error.kind}`)

  return result.value
}

const run = runState({ rules: defaultRules() })

describe("Set the Rules", () => {
  test("sets the changed Rule and keeps the others", () => {
    const next = predicted(run, {
      runId: run.id,
      rules: { "duplicate-clause": true },
    })

    expect(next.rules).toEqual({
      ...defaultRules(),
      "duplicate-clause": true,
    })
  })

  test("keeps a Rule this build does not know", () => {
    const withUnknown = runState({ rules: { "level-cap": true } })

    expect(
      predicted(withUnknown, {
        runId: withUnknown.id,
        rules: { whiteout: true },
      }).rules
    ).toEqual({ "level-cap": true, whiteout: true })
  })

  test("the Shared Duplicate Clause turns the Duplicate Clause on", () => {
    const soulLink = runState({ kind: "soul_link", rules: defaultRules() })
    const next = predicted(soulLink, {
      runId: soulLink.id,
      rules: { "shared-duplicate-clause": true },
    })

    expect(next.rules["duplicate-clause"]).toBe(true)
  })

  test("the Duplicate Clause going off turns the shared one off", () => {
    const both = runState({
      kind: "soul_link",
      rules: {
        ...defaultRules(),
        "duplicate-clause": true,
        "shared-duplicate-clause": true,
      },
    })
    const next = predicted(both, {
      runId: both.id,
      rules: { "duplicate-clause": false },
    })

    expect(next.rules["shared-duplicate-clause"]).toBe(false)
  })

  test("a value already set is a no-op", () => {
    const args = { runId: run.id, rules: { "first-encounter": true } }

    expect(check(run, args)).toEqual(ok(unchanged()))
    expect(predicted(run, args)).toBe(run)
  })

  test.each<RunLifeState | null>(["waiting", "failed", "complete", null])(
    "a %s Run refuses it as run-not-active",
    (state) => {
      expect(
        predict({ ...run, state }, { runId: run.id, rules: { whiteout: true } })
      ).toEqual({ ok: false, error: { kind: "run-not-active" } })
    }
  )

  test("leaves a frozen Run as it was", () => {
    const frozen = deepFrozen(run)
    const before = structuredClone(frozen)

    predicted(frozen, { runId: run.id, rules: { whiteout: true } })

    expect(frozen).toEqual(before)
  })
})
