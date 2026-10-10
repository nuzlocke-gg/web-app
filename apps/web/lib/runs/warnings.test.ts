import { loadMap } from "@workspace/game-data"
import { v7 as uuidv7 } from "uuid"
import { describe, expect, test } from "vitest"

import {
  encounterState,
  journeyState,
  pokemonState,
  runState,
} from "@/test/run-state"

import type { RecordEncounterArgs } from "./changes/record-encounter"
import { renamePokemon } from "./mutations"
import type { GameFacts } from "./rule-checks"
import { defaultRules, type RuleId } from "./rules"
import type {
  EncounterState,
  JourneyState,
  PokemonState,
  RunState,
} from "./state"
import { computeWarnings, gameFactsOf, warningsOfRecord } from "./warnings"

const lines: Record<string, string> = {
  zigzagoon: "zigzagoon",
  linoone: "zigzagoon",
  poochyena: "poochyena",
  mightyena: "poochyena",
  taillow: "taillow",
}

const facts: GameFacts = { evolutionLineOf: (species) => lines[species] }

/** Every Rule Off but the ones named. */
function only(...on: RuleId[]): Record<string, boolean> {
  return Object.fromEntries(
    Object.keys(defaultRules()).map((id) => [id, on.includes(id as RuleId)])
  )
}

let minute = 0

/** An Encounter a minute after the one before, Caught unless said otherwise. */
function met(
  species: string | null,
  overrides: Partial<EncounterState> = {}
): EncounterState {
  minute += 1

  return encounterState({
    met: species ? { species, form: "base" } : null,
    enteredAt: Date.UTC(2026, 9, 1, 0, minute),
    ...overrides,
  })
}

/** A Journey with these Encounters and a Pokémon for each Caught one. */
function journeyOf(
  encounters: EncounterState[],
  pokemon: Partial<PokemonState>[] = []
): JourneyState {
  return journeyState({
    encounters,
    pokemon: encounters
      .filter((encounter) => encounter.outcome === "caught")
      .map((encounter, index) =>
        pokemonState(encounter, { nickname: "Pal", ...pokemon[index] })
      ),
  })
}

function runWith(journey: JourneyState, rules: Record<string, boolean>) {
  return runState({ rules, journeys: [journey] })
}

describe("First Encounter Rule", () => {
  test("marks each Encounter after the first at one Place", () => {
    const first = met("taillow", { placeId: "route-104" })
    const second = met("zigzagoon", { placeId: "route-104", slot: 2 })
    const third = met(null, {
      placeId: "route-104",
      slot: 3,
      outcome: "failed",
    })
    const run = runWith(
      journeyOf([first, second, third]),
      only("first-encounter")
    )

    expect(computeWarnings(run, facts)).toEqual([
      {
        rule: "first-encounter",
        journeyId: run.journeys[0]!.id,
        encounterId: second.id,
        firstEncounterId: first.id,
      },
      {
        rule: "first-encounter",
        journeyId: run.journeys[0]!.id,
        encounterId: third.id,
        firstEncounterId: first.id,
      },
    ])
  })

  test("counts a Failed first Encounter with no Species", () => {
    const run = runWith(
      journeyOf([
        met(null, { placeId: "route-104", outcome: "failed" }),
        met("taillow", { placeId: "route-104", slot: 2 }),
      ]),
      only("first-encounter")
    )

    expect(computeWarnings(run, facts)).toHaveLength(1)
  })

  test("counts a Place the game data does not have, as a Custom location", () => {
    const run = runWith(
      journeyOf([
        met("taillow", { placeId: "custom:lake-house" }),
        met("zigzagoon", { placeId: "custom:lake-house", slot: 2 }),
      ]),
      only("first-encounter")
    )

    expect(computeWarnings(run, facts)).toHaveLength(1)
  })

  test("one Encounter at each Place gives none", () => {
    const run = runWith(
      journeyOf([
        met("taillow", { placeId: "route-104" }),
        met("zigzagoon", { placeId: "route-101" }),
      ]),
      only("first-encounter")
    )

    expect(computeWarnings(run, facts)).toEqual([])
  })

  test("goes when the later Encounter is removed or the Rule is off", () => {
    const first = met("taillow", { placeId: "route-104" })
    const run = runWith(
      journeyOf([first, met("zigzagoon", { placeId: "route-104", slot: 2 })]),
      only("first-encounter")
    )

    expect(computeWarnings(run, facts)).toHaveLength(1)
    expect(
      computeWarnings(runWith(journeyOf([first]), run.rules), facts)
    ).toEqual([])
    expect(computeWarnings({ ...run, rules: only() }, facts)).toEqual([])
  })
})

describe("Nickname Clause", () => {
  test("marks a living Pokémon with no nickname, in the Party or the Box", () => {
    const inParty = met("taillow")
    const inBox = met("zigzagoon")
    const run = runWith(
      journeyOf(
        [inParty, inBox],
        [{ nickname: null }, { nickname: null, inParty: false }]
      ),
      only("nickname-clause")
    )
    const pokemon = run.journeys[0]!.pokemon

    expect(computeWarnings(run, facts)).toEqual([
      {
        rule: "nickname-clause",
        journeyId: run.journeys[0]!.id,
        encounterId: inParty.id,
        pokemonId: pokemon[0]!.id,
      },
      {
        rule: "nickname-clause",
        journeyId: run.journeys[0]!.id,
        encounterId: inBox.id,
        pokemonId: pokemon[1]!.id,
      },
    ])
  })

  test("a dead or removed Pokémon gives none", () => {
    const run = runWith(
      journeyOf(
        [met("taillow"), met("zigzagoon")],
        [
          { nickname: null, diedAt: Date.UTC(2026, 9, 2) },
          { nickname: null, removedAt: Date.UTC(2026, 9, 2) },
        ]
      ),
      only("nickname-clause")
    )

    expect(computeWarnings(run, facts)).toEqual([])
  })

  test("goes when the player gives a nickname, also while it is pending", () => {
    const run = runWith(
      journeyOf([met("taillow")], [{ nickname: null }]),
      only("nickname-clause")
    )
    const renamed = renamePokemon.predict(
      run,
      {
        runId: run.id,
        pokemonId: run.journeys[0]!.pokemon[0]!.id,
        nickname: "Swoop",
      },
      { mutationId: uuidv7() }
    )

    if (!renamed.ok) throw new Error("Refused")

    expect(computeWarnings(run, facts)).toHaveLength(1)
    expect(computeWarnings(renamed.value, facts)).toEqual([])
  })

  test("is silent while the Rule is off", () => {
    const run = runWith(journeyOf([met("taillow")], [{ nickname: null }]), {})

    expect(computeWarnings(run, facts)).toEqual([])
  })
})

describe("Duplicate Clause", () => {
  test("marks a later Caught Encounter in the line of an earlier one", () => {
    const first = met("zigzagoon")
    const later = met("linoone")
    const run = runWith(journeyOf([first, later]), only("duplicate-clause"))

    expect(computeWarnings(run, facts)).toEqual([
      {
        rule: "duplicate-clause",
        journeyId: run.journeys[0]!.id,
        encounterId: later.id,
        earlierEncounterId: first.id,
      },
    ])
  })

  test("counts an earlier Pokémon that is dead or removed", () => {
    for (const gone of [
      { diedAt: Date.UTC(2026, 9, 2) },
      { removedAt: Date.UTC(2026, 9, 2) },
    ]) {
      const run = runWith(
        journeyOf([met("poochyena"), met("mightyena")], [gone]),
        only("duplicate-clause")
      )

      expect(computeWarnings(run, facts)).toHaveLength(1)
    }
  })

  test("a Failed Encounter neither counts nor gets a Warning", () => {
    const run = runWith(
      journeyOf([
        met("zigzagoon", { outcome: "failed" }),
        met("linoone"),
        met("zigzagoon", { outcome: "failed" }),
      ]),
      only("duplicate-clause")
    )

    expect(computeWarnings(run, facts)).toEqual([])
  })

  test("skips a Species the game data has no line for", () => {
    const run = runWith(
      journeyOf([met("missingno"), met("missingno")]),
      only("duplicate-clause")
    )

    expect(computeWarnings(run, facts)).toEqual([])
  })

  test("goes when the later Encounter is corrected to another line", () => {
    const first = met("zigzagoon")
    const later = met("linoone")
    const corrected = { ...later, met: { species: "taillow", form: "base" } }

    expect(
      computeWarnings(
        runWith(journeyOf([first, corrected]), only("duplicate-clause")),
        facts
      )
    ).toEqual([])
  })

  test("reads lines from the game data of a real Map", async () => {
    const map = (await loadMap("emerald"))!
    const run = runWith(
      journeyOf([met("poochyena"), met("mightyena")]),
      only("duplicate-clause")
    )

    expect(computeWarnings(run, gameFactsOf(map))).toHaveLength(1)
  })
})

test("each Journey of a Soul Link is checked on its own", () => {
  const mine = journeyOf([met("zigzagoon")])
  const partners = {
    ...journeyOf([met("linoone")]),
    id: uuidv7(),
    playerId: uuidv7(),
  }
  const run = runState({
    kind: "soul_link",
    rules: only("duplicate-clause"),
    journeys: [mine, partners],
  })

  expect(computeWarnings(run, facts)).toEqual([])
})

describe("warningsOfRecord", () => {
  function recordArgs(
    run: RunState,
    overrides: Partial<RecordEncounterArgs> = {}
  ): RecordEncounterArgs {
    return {
      runId: run.id,
      encounterId: uuidv7(),
      placeId: "route-104",
      slot: 2,
      origin: "wild",
      enteredAt: Date.UTC(2026, 9, 3),
      outcome: {
        kind: "caught",
        met: { species: "mightyena", form: "base" },
        pokemonId: uuidv7(),
        goesTo: "party",
      },
      ...overrides,
    }
  }

  test("gives the Warnings the save adds, with the predicted Run", () => {
    const run = runWith(
      journeyOf([
        met("poochyena", { placeId: "route-101" }),
        met("taillow", { placeId: "route-104" }),
      ]),
      only("first-encounter", "nickname-clause", "duplicate-clause")
    )
    const args = recordArgs(run)
    const preview = warningsOfRecord(run, facts, args)

    expect(preview?.warnings.map((warning) => warning.rule)).toEqual([
      "first-encounter",
      "nickname-clause",
      "duplicate-clause",
    ])
    expect(
      preview?.warnings.every(
        (warning) => warning.encounterId === args.encounterId
      )
    ).toBe(true)
    expect(
      preview?.run.journeys[0]!.encounters.some(
        (encounter) => encounter.id === args.encounterId
      )
    ).toBe(true)
  })

  test("gives a Warning the save puts on an existing row", () => {
    const existing = met("mightyena", { placeId: "route-104" })
    const run = runWith(journeyOf([existing]), only("duplicate-clause"))
    // The device clock is behind, so the new Encounter sorts first.
    const args = recordArgs(run, {
      placeId: "route-101",
      slot: 1,
      enteredAt: Date.UTC(2026, 8, 1),
      outcome: {
        kind: "caught",
        met: { species: "poochyena", form: "base" },
        pokemonId: uuidv7(),
        goesTo: "party",
      },
    })

    expect(warningsOfRecord(run, facts, args)?.warnings).toEqual([
      {
        rule: "duplicate-clause",
        journeyId: run.journeys[0]!.id,
        encounterId: existing.id,
        earlierEncounterId: args.encounterId,
      },
    ])
  })

  test("leaves out the Warnings the Run already has", () => {
    const run = runWith(
      journeyOf([met("taillow")], [{ nickname: null }]),
      only("nickname-clause")
    )
    const args = recordArgs(run, {
      outcome: {
        kind: "caught",
        met: { species: "zigzagoon", form: "base" },
        pokemonId: uuidv7(),
        nickname: "Zig",
        goesTo: "party",
      },
    })

    expect(warningsOfRecord(run, facts, args)?.warnings).toEqual([])
  })

  test("is null when the save would be refused", () => {
    const run = runWith(
      journeyOf([met("taillow", { placeId: "route-104", slot: 2 })]),
      only("first-encounter")
    )

    expect(warningsOfRecord(run, facts, recordArgs(run))).toBeNull()
  })
})
