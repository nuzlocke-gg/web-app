import { unchanged, type Unchanged } from "headcanon"
import { produce } from "immer"
import { err, ok, type Result } from "serializable-result"
import { z } from "zod"

import { admitsChanges } from "../can-change"
import { refusal, type RunRefusal } from "../refusals"
import { ruleChanges, rulePatch, type RulePatch } from "../rules"
import type { RunState } from "../state"

/** The arguments of Set the Rules: only the Rules the player changed. */
export const setRulesArgs = z.object({
  runId: z.uuid(),
  rules: rulePatch,
})

/** The arguments of Set the Rules. */
export type SetRulesArgs = z.infer<typeof setRulesArgs>

/** The Refusals that {@link check} gives. */
export type SetRulesRefusal = RunRefusal<"run-not-active">

/** What Set the Rules changes: each Rule that changes, with its new value. */
export type SetRulesEffect = {
  rules: RulePatch
}

/**
 * Decides Set the Rules for any player of the Run: refused on a Run that is
 * not Active. The Duplicate Clause dependency is normalized by
 * {@link ruleChanges}.
 * @returns {@link unchanged} when every Rule already has its value.
 */
export function check(
  run: RunState,
  args: SetRulesArgs
): Result<SetRulesEffect | Unchanged, SetRulesRefusal> {
  if (!admitsChanges(run)) return err(refusal("run-not-active"))

  const changes = ruleChanges(run.rules, args.rules)

  if (Object.keys(changes).length === 0) return ok(unchanged())

  return ok({ rules: changes })
}

/** Merges the changed Rules into the Run's Rules. */
export function apply(run: RunState, effect: SetRulesEffect): RunState {
  return produce(run, (draft) => {
    Object.assign(draft.rules, effect.rules)
  })
}
