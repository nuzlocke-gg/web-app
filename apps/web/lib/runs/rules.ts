import { z } from "zod"

import {
  checkDuplicateClause,
  checkFirstEncounter,
  checkNicknameClause,
  type RuleCheck,
} from "./rule-checks"
import type { RunKind } from "./state"

/** The shape of every entry of {@link rules}. */
type RuleDefinition = {
  /**
   * The permanent key of a Run's `rules` map (ADR 0007). It never changes
   * meaning once released.
   */
  id: string
  name: string
  /** The one sentence under its switch. */
  description: string
  /** Whether a new Run has it on. */
  default: boolean
  /** Shown, and checked, only on a Soul Link. */
  soulLinkOnly: boolean
  /**
   * The pure check that gives its Warnings, or null for a Rule that gives
   * none yet (the Whiteout Rule suggests failing the Run instead).
   */
  check: RuleCheck | null
}

/** Every Rule, in the order the screens list them. */
export const rules = [
  {
    id: "first-encounter",
    name: "First Encounter Rule",
    description:
      "You can have only one encounter on each route or area. If you miss it, that route gives nothing.",
    default: true,
    soulLinkOnly: false,
    check: checkFirstEncounter,
  },
  {
    id: "nickname-clause",
    name: "Nickname Clause",
    description: "You must give each Pokémon a nickname.",
    default: true,
    soulLinkOnly: false,
    check: checkNicknameClause,
  },
  {
    id: "duplicate-clause",
    name: "Duplicate Clause",
    description:
      "If you catch a Pokémon, you cannot catch or receive another Pokémon in the same evolution line.",
    default: false,
    soulLinkOnly: false,
    check: checkDuplicateClause,
  },
  {
    id: "whiteout",
    name: "Whiteout Rule",
    description:
      "If every Pokémon in your party dies, the run is over, even with Pokémon in the box. The app suggests marking the run as failed.",
    default: false,
    soulLinkOnly: false,
    check: null,
  },
  {
    id: "shared-fate",
    name: "Shared Fate",
    description: "When a Pokémon dies, the Pokémon linked to it die too.",
    default: true,
    soulLinkOnly: true,
    check: null,
  },
  {
    id: "linked-party",
    name: "Linked Party",
    description:
      "Linked Pokémon must be in the party together or in the box together.",
    default: true,
    soulLinkOnly: true,
    check: null,
  },
  {
    id: "complete-links",
    name: "Complete Links",
    description:
      "You can use a Pokémon only while each player has a living Pokémon in its link.",
    default: true,
    soulLinkOnly: true,
    check: null,
  },
  {
    id: "type-restriction",
    name: "Type Restriction",
    description:
      "No primary type can appear twice across the parties of all players.",
    default: false,
    soulLinkOnly: true,
    check: null,
  },
  {
    id: "shared-duplicate-clause",
    name: "Shared Duplicate Clause",
    description:
      "The Duplicate Clause counts the Pokémon of all players. It turns on the Duplicate Clause.",
    default: false,
    soulLinkOnly: true,
    check: null,
  },
] as const satisfies readonly RuleDefinition[]

/** One Rule a Run can select. */
export type Rule = (typeof rules)[number]

/** A Rule's permanent identifier. */
export type RuleId = Rule["id"]

/**
 * The Rule map of a new Run: every Rule with its default, written out, so a
 * Rule that a later release adds is Off on this Run (ADR 0007).
 */
export function defaultRules(): Record<RuleId, boolean> {
  return Object.fromEntries(
    rules.map((rule) => [rule.id, rule.default])
  ) as Record<RuleId, boolean>
}

/** The name of a Rule, as the screens show it. */
export function ruleName(id: RuleId): string {
  const rule = rules.find((candidate) => candidate.id === id)

  if (!rule) throw new Error(`No Rule ${id}`)

  return rule.name
}

/** The Rules a Run of this kind shows. */
export function rulesShown(kind: RunKind): readonly Rule[] {
  return kind === "soul_link"
    ? rules
    : rules.filter((rule) => !rule.soulLinkOnly)
}

/**
 * The Rules shown for a Run of this kind that its map has on. An absent key is
 * Off.
 */
export function rulesOn(
  kind: RunKind,
  ruleMap: Readonly<Record<string, boolean>>
): readonly Rule[] {
  return rulesShown(kind).filter((rule) => ruleMap[rule.id] === true)
}

/** Every Rule identifier, for a schema over them. */
const ruleIds = rules.map((rule) => rule.id) as [RuleId, ...RuleId[]]

/**
 * A change to a Run's Rules in parsed form: one or more known Rules, each
 * set On or Off.
 */
export const rulePatch = z
  .partialRecord(z.enum(ruleIds), z.boolean())
  .refine(
    (patch) => Object.keys(patch).length > 0,
    "A change to the Rules sets at least one Rule."
  )

/** A change to a Run's Rules. */
export type RulePatch = z.infer<typeof rulePatch>

/**
 * The Rules that change when a player sets `patch` on a Run whose Rules are
 * `current`, each with its new value. Keeps the Rules consistent: the Shared
 * Duplicate Clause going on turns the Duplicate Clause on, and the Duplicate
 * Clause going off turns the shared one off; a patch that asks for both
 * leaves both Off. A Rule already at its value is left out, so an empty
 * result changes nothing.
 * @example
 * ruleChanges({ "duplicate-clause": false }, { "shared-duplicate-clause": true })
 * // { "shared-duplicate-clause": true, "duplicate-clause": true }
 */
export function ruleChanges(
  current: Readonly<Record<string, boolean>>,
  patch: RulePatch
): RulePatch {
  const next: Record<string, boolean> = { ...current, ...patch }

  if (patch["duplicate-clause"] === false) {
    next["shared-duplicate-clause"] = false
  } else if (patch["shared-duplicate-clause"] === true) {
    next["duplicate-clause"] = true
  }

  const changes: RulePatch = {}

  for (const { id } of rules) {
    const on = next[id] === true

    if (on !== (current[id] === true)) changes[id] = on
  }

  return changes
}

/**
 * The Rule map of a new Run whose player chose `chosen` on the New run
 * screen: every Rule written out, at its default unless chosen.
 */
export function newRunRules(chosen: RulePatch = {}): Record<RuleId, boolean> {
  const defaults = defaultRules()

  return { ...defaults, ...ruleChanges(defaults, chosen) }
}
