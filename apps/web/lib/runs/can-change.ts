import type { RunState } from "./state"

/**
 * The state half of the `canChange` policy: only an Active Run admits a
 * `run.v1` change. Each change's `check` asks it first, so the predictor and
 * the server refuse alike, as `run-not-active`.
 *
 * The access half (a Player changes their own Journey only) is the server's:
 * each command's `admit` decides it under the Run lock.
 */
export function admitsChanges(run: RunState): boolean {
  return run.state === "active"
}
