import { evolutionLineOf, type LoadedMap } from "@workspace/game-data"
import { v7 as uuidv7 } from "uuid"

import type { RecordEncounterArgs } from "./changes/record-encounter"
import { recordEncounter } from "./mutations"
import type { GameFacts, Warning } from "./rule-checks"
import { rulesOn } from "./rules"
import type { RunState } from "./state"

/** The game-data facts of a loaded Map, for {@link computeWarnings}. */
export function gameFactsOf(map: LoadedMap): GameFacts {
  return { evolutionLineOf: (species) => evolutionLineOf(map, species) }
}

/**
 * Every Warning of the Run: the checks of the Rules it has on, in the order
 * the screens list the Rules. Pure; pass the displayed Run (canon plus
 * pending predictions). A Run of a kind this build does not know is checked
 * against the Rules of every Run.
 * @example
 * computeWarnings(run, gameFactsOf(map))
 */
export function computeWarnings(run: RunState, facts: GameFacts): Warning[] {
  return rulesOn(run.kind ?? "solo", run.rules).flatMap(
    (rule) => rule.check?.(run, facts) ?? []
  )
}

/**
 * What saving Record an Encounter with these arguments would do to the
 * Warnings: the predicted Run, and the Warnings it has that the Run has not
 * now, to format against that predicted Run. Null when the change would be
 * refused.
 */
export function warningsOfRecord(
  run: RunState,
  facts: GameFacts,
  args: RecordEncounterArgs
): { run: RunState; warnings: Warning[] } | null {
  const predicted = recordEncounter.predict(run, args, { mutationId: uuidv7() })

  if (!predicted.ok) return null

  const before = new Set(computeWarnings(run, facts).map(warningKey))
  const warnings = computeWarnings(predicted.value, facts).filter(
    (warning) => !before.has(warningKey(warning))
  )

  return { run: predicted.value, warnings }
}

function warningKey(warning: Warning): string {
  return `${warning.rule}:${warning.encounterId}`
}
