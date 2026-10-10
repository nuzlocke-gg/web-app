import { eq } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import { describe, expect, test } from "vitest"

import { db } from "@/lib/db"
import { postgresErrorCode } from "@/lib/db/errors"
import {
  encounters,
  evolutions,
  journeys,
  pokemon,
  runs,
  users,
} from "@/lib/db/schema"
import { createPlayer } from "@/test/players"
import { insertJourney, insertRun, soloRunValues } from "@/test/runs"

const CHECK_VIOLATION = "23514"
const UNIQUE_VIOLATION = "23505"
const FOREIGN_KEY_VIOLATION = "23503"

async function insertError(values: typeof users.$inferInsert) {
  try {
    await db.insert(users).values(values)
  } catch (error) {
    return postgresErrorCode(error)
  }

  return "inserted"
}

describe("users", () => {
  test("the tombstone CHECK refuses deleted_at with an email still present", async () => {
    await expect(
      insertError({
        deletedAt: new Date(),
        email: `${randomUUID()}@example.test`,
      })
    ).resolves.toBe(CHECK_VIOLATION)
  })

  test("the tombstone CHECK refuses deleted_at with a Display Name still present", async () => {
    await expect(
      insertError({ deletedAt: new Date(), displayName: "Ash" })
    ).resolves.toBe(CHECK_VIOLATION)
  })

  test("the Display Name CHECK refuses 31 characters and an empty name", async () => {
    await expect(insertError({ displayName: "a".repeat(31) })).resolves.toBe(
      CHECK_VIOLATION
    )
    await expect(insertError({ displayName: "" })).resolves.toBe(
      CHECK_VIOLATION
    )
  })

  test("the Display Name CHECK counts code points, as the screen does", async () => {
    await expect(insertError({ displayName: "🐉".repeat(30) })).resolves.toBe(
      "inserted"
    )
  })

  test("a non-null email is unique; null emails are not", async () => {
    const email = `${randomUUID()}@example.test`

    await expect(insertError({ email })).resolves.toBe("inserted")
    await expect(insertError({ email })).resolves.toBe("23505")
    await expect(insertError({ deletedAt: new Date() })).resolves.toBe(
      "inserted"
    )
    await expect(insertError({ deletedAt: new Date() })).resolves.toBe(
      "inserted"
    )
  })
})

async function runInsertError(values: typeof runs.$inferInsert) {
  try {
    await db.insert(runs).values(values)
  } catch (error) {
    return postgresErrorCode(error)
  }

  return "inserted"
}

describe("runs", () => {
  test("a valid solo Run is inserted", async () => {
    await expect(runInsertError(soloRunValues())).resolves.toBe("inserted")
  })

  test.each<[string, Partial<typeof runs.$inferInsert>]>([
    ["an empty name", { name: "" }],
    ["a 61-character name", { name: "a".repeat(61) }],
    ["House rules over 2000 characters", { houseRules: "a".repeat(2001) }],
    ["a waiting solo Run", { state: "waiting" }],
    ["a fail cause on an active Run", { failCause: "Wiped to Norman" }],
    ["a finish date on an active Run", { finishedAt: new Date() }],
    ["a failed Run with no finish date", { state: "failed" }],
    ["an invite on an active Run", { inviteToken: randomUUID() }],
    ["a second Attempt with no previous Run", { attemptNumber: 2 }],
  ])("the CHECKs refuse %s", async (_, overrides) => {
    await expect(runInsertError(soloRunValues(overrides))).resolves.toBe(
      CHECK_VIOLATION
    )
  })

  test("a first Attempt with a previous Run is refused", async () => {
    const previousRunId = await insertRun()

    await expect(
      runInsertError(soloRunValues({ previousRunId }))
    ).resolves.toBe(CHECK_VIOLATION)
  })

  test("a Failed Run has at most one next Run", async () => {
    const chainId = await insertRun({
      state: "failed",
      finishedAt: new Date(),
    })
    const next = { previousRunId: chainId, chainId, attemptNumber: 2 }

    await expect(runInsertError(soloRunValues(next))).resolves.toBe("inserted")
    await expect(
      runInsertError(soloRunValues({ ...next, attemptNumber: 3 }))
    ).resolves.toBe(UNIQUE_VIOLATION)
  })
})

describe("journeys", () => {
  test("a Player has at most one Journey in a Run", async () => {
    const runId = await insertRun()
    const playerId = await createPlayer({ displayName: "Ash" })
    const journey = () => ({
      id: randomUUID(),
      runId,
      playerId,
      gameId: "emerald",
    })

    await db.insert(journeys).values(journey())

    await expect(
      db
        .insert(journeys)
        .values(journey())
        .then(
          () => "inserted",
          (error: unknown) => postgresErrorCode(error)
        )
    ).resolves.toBe(UNIQUE_VIOLATION)
  })
})

function insertOutcome(insert: Promise<unknown>) {
  return insert.then(
    () => "inserted",
    (error: unknown) => postgresErrorCode(error)
  )
}

/** A Run with one Journey, and a Caught Mudkip Encounter's columns in it. */
async function journeyWithEncounter() {
  const runId = await insertRun()
  const journeyId = await insertJourney(
    runId,
    await createPlayer({ displayName: "Ash" })
  )
  const encounter: typeof encounters.$inferInsert = {
    id: randomUUID(),
    runId,
    journeyId,
    placeId: "starter",
    slotOrdinal: 1,
    origin: "gift",
    outcome: "caught",
    speciesId: "mudkip",
    formId: "base",
    enteredAt: new Date(),
  }

  return { runId, journeyId, encounter }
}

describe("encounters", () => {
  test("a valid Caught Encounter is inserted", async () => {
    const { encounter } = await journeyWithEncounter()

    await expect(
      insertOutcome(db.insert(encounters).values(encounter))
    ).resolves.toBe("inserted")
  })

  test.each<[string, Partial<typeof encounters.$inferInsert>]>([
    ["a Caught Encounter with no Species", { speciesId: null, formId: null }],
    ["a Species with no Form", { outcome: "failed", formId: null }],
    ["no Place", { placeId: null }],
    ["a Place and a Custom Place", { customPlaceId: randomUUID() }],
    ["Slot 0", { slotOrdinal: 0 }],
  ])("the CHECKs refuse %s", async (_, overrides) => {
    const { encounter } = await journeyWithEncounter()

    await expect(
      insertOutcome(
        db.insert(encounters).values({ ...encounter, ...overrides })
      )
    ).resolves.toBe(CHECK_VIOLATION)
  })

  test("a Journey has one Encounter at most in a Slot", async () => {
    const { encounter } = await journeyWithEncounter()

    await db.insert(encounters).values(encounter)

    await expect(
      insertOutcome(
        db.insert(encounters).values({ ...encounter, id: randomUUID() })
      )
    ).resolves.toBe(UNIQUE_VIOLATION)
  })

  test("an Encounter sits in the Run of its Journey", async () => {
    const { encounter } = await journeyWithEncounter()
    const otherRunId = await insertRun()

    await expect(
      insertOutcome(
        db.insert(encounters).values({ ...encounter, runId: otherRunId })
      )
    ).resolves.toBe(FOREIGN_KEY_VIOLATION)
  })
})

describe("pokemon", () => {
  async function pokemonValuesWithInsertedEncounter() {
    const { journeyId, encounter } = await journeyWithEncounter()

    await db.insert(encounters).values(encounter)

    const pokemonValues: typeof pokemon.$inferInsert = {
      id: randomUUID(),
      journeyId,
      encounterId: encounter.id!,
      speciesId: "mudkip",
      formId: "base",
      inParty: true,
    }

    return pokemonValues
  }

  test("a second Pokémon for one Encounter is refused by the unique index", async () => {
    const pokemonValues = await pokemonValuesWithInsertedEncounter()

    await db.insert(pokemon).values(pokemonValues)

    await expect(
      insertOutcome(
        db.insert(pokemon).values({ ...pokemonValues, id: randomUUID() })
      )
    ).resolves.toBe(UNIQUE_VIOLATION)
  })

  test.each<[string, Partial<typeof pokemon.$inferInsert>]>([
    ["a 13-character nickname", { nickname: "a".repeat(13) }],
    ["an empty nickname", { nickname: "" }],
    ["a death level on a living Pokémon", { deathLevel: 24 }],
    ["a death cause on a living Pokémon", { deathCause: "Crit" }],
  ])("the CHECKs refuse %s", async (_, overrides) => {
    const pokemonValues = await pokemonValuesWithInsertedEncounter()

    await expect(
      insertOutcome(
        db.insert(pokemon).values({ ...pokemonValues, ...overrides })
      )
    ).resolves.toBe(CHECK_VIOLATION)
  })

  test("the nickname CHECK counts code points, as the screen does", async () => {
    const pokemonValues = await pokemonValuesWithInsertedEncounter()

    await expect(
      insertOutcome(
        db
          .insert(pokemon)
          .values({ ...pokemonValues, nickname: "🐉".repeat(12) })
      )
    ).resolves.toBe("inserted")
  })

  test("a Pokémon sits in the Journey of its Encounter", async () => {
    const pokemonValues = await pokemonValuesWithInsertedEncounter()
    const { journeyId: otherJourneyId } = await journeyWithEncounter()

    await expect(
      insertOutcome(
        db
          .insert(pokemon)
          .values({ ...pokemonValues, journeyId: otherJourneyId })
      )
    ).resolves.toBe(FOREIGN_KEY_VIOLATION)
  })
})

describe("evolutions", () => {
  async function insertedPokemon() {
    const { journeyId, encounter } = await journeyWithEncounter()
    const pokemonId = randomUUID()

    await db.insert(encounters).values(encounter)
    await db.insert(pokemon).values({
      id: pokemonId,
      journeyId,
      encounterId: encounter.id!,
      speciesId: "mudkip",
      formId: "base",
      inParty: true,
    })

    return { encounterId: encounter.id!, pokemonId }
  }

  function line(pokemonId: string): typeof evolutions.$inferInsert {
    return {
      id: randomUUID(),
      pokemonId,
      speciesFrom: "mudkip",
      formFrom: "base",
      speciesTo: "marshtomp",
      formTo: "base",
      enteredAt: new Date(),
    }
  }

  test("a line belongs to a Pokémon that exists", async () => {
    await expect(
      insertOutcome(db.insert(evolutions).values(line(randomUUID())))
    ).resolves.toBe(FOREIGN_KEY_VIOLATION)
  })

  test("removing the Encounter takes the Pokémon's lines with it", async () => {
    const { encounterId, pokemonId } = await insertedPokemon()

    await db.insert(evolutions).values(line(pokemonId))
    await db.delete(encounters).where(eq(encounters.id, encounterId))

    await expect(
      db.select().from(evolutions).where(eq(evolutions.pokemonId, pokemonId))
    ).resolves.toEqual([])
  })
})
