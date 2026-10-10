import type { RunKind } from "./state"

/** The shape of every entry of {@link rules}. */
type RuleDefinition = {
  /**
   * The permanent key of a Run's `rules` map (ADR 0007). It never changes
   * meaning once released.
   */
  id: string
  name: string
  /** Whether a new Run has it on. */
  default: boolean
  /** Shown, and checked, only on a Soul Link. */
  soulLinkOnly: boolean
}

/** Every Rule, in the order the screens list them. */
export const rules = [
  {
    id: "first-encounter",
    name: "First Encounter Rule",
    default: true,
    soulLinkOnly: false,
  },
  {
    id: "nickname-clause",
    name: "Nickname Clause",
    default: true,
    soulLinkOnly: false,
  },
  {
    id: "duplicate-clause",
    name: "Duplicate Clause",
    default: false,
    soulLinkOnly: false,
  },
  {
    id: "whiteout",
    name: "Whiteout Rule",
    default: false,
    soulLinkOnly: false,
  },
  { id: "shared-fate", name: "Shared Fate", default: true, soulLinkOnly: true },
  {
    id: "linked-party",
    name: "Linked Party",
    default: true,
    soulLinkOnly: true,
  },
  {
    id: "complete-links",
    name: "Complete Links",
    default: true,
    soulLinkOnly: true,
  },
  {
    id: "type-restriction",
    name: "Type Restriction",
    default: false,
    soulLinkOnly: true,
  },
  {
    id: "shared-duplicate-clause",
    name: "Shared Duplicate Clause",
    default: false,
    soulLinkOnly: true,
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
