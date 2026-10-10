import { sql } from "drizzle-orm"
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core"
import { ORIGINS } from "@workspace/game-data"
import type { AdapterAccountType } from "next-auth/adapters"

import {
  encounterOutcomes,
  runKinds,
  runLifeStates,
  runVisibilities,
} from "../runs/state"

export { headcanonMutationReceipts } from "headcanon/drizzle-schema"

/**
 * A Player's account: the Auth.js adapter's user table, defined by us. A row
 * with `deleted_at` set is a tombstone that renders as "Deleted player".
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email"),
    emailVerified: timestamp("email_verified", {
      withTimezone: true,
      mode: "date",
    }),
    // The Google given name only, kept to prefill the Display Name. The app
    // never shows it, and never stores the surname or the picture.
    name: text("name"),
    image: text("image"),
    displayName: text("display_name"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    uniqueIndex("users_email_key")
      .on(table.email)
      .where(sql`${table.email} IS NOT NULL`),
    // char_length counts code points, as parseDisplayName does.
    check(
      "users_display_name_length",
      sql`char_length(${table.displayName}) BETWEEN 1 AND 30`
    ),
    check(
      "users_tombstone",
      sql`${table.deletedAt} IS NULL OR (${table.email} IS NULL AND ${table.displayName} IS NULL AND ${table.name} IS NULL AND ${table.image} IS NULL)`
    ),
  ]
)

/** The OAuth accounts linked to a Player (the Auth.js adapter's columns). */
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    // The Google provider stores no tokens (see lib/auth.ts); the columns
    // exist because the adapter's table type requires them.
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
    index("accounts_user_id_idx").on(table.userId),
  ]
)

/** Auth.js database sessions. */
export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)]
)

/** Solo or Soul Link, fixed when the Run is made (ADR 0004). */
export const runKind = pgEnum("run_kind", runKinds)

/** Where a Run is in its life. */
export const runState = pgEnum("run_state", runLifeStates)

/** Who can read a Run: its Players only, or anyone with its link. */
export const runVisibility = pgEnum("run_visibility", runVisibilities)

/**
 * A Run: one attempt at a Nuzlocke. Its `revision` is the version of the
 * headcanon axis `run/<id>`; every writer bumps it with `last_changed_at`
 * under the Run lock (ADR 0002).
 */
export const runs = pgTable(
  "runs",
  {
    // A random v4 made by the server: the id is also the unguessable link.
    id: uuid("id").primaryKey(),
    kind: runKind("kind").notNull(),
    state: runState("state").notNull(),
    name: text("name").notNull(),
    mapId: text("map_id").notNull(),
    visibility: runVisibility("visibility").notNull().default("private"),
    // { ruleId: boolean }; the rules module owns the ids (ADR 0007).
    rules: jsonb("rules").$type<Record<string, boolean>>().notNull(),
    houseRules: text("house_rules"),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }),
    failCause: text("fail_cause"),
    lastChangedAt: timestamp("last_changed_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    revision: bigint("revision", { mode: "number" }).notNull(),
    previousRunId: uuid("previous_run_id").references(
      (): AnyPgColumn => runs.id
    ),
    chainId: uuid("chain_id")
      .notNull()
      .references((): AnyPgColumn => runs.id),
    attemptNumber: integer("attempt_number").notNull(),
    inviteToken: text("invite_token"),
  },
  (table) => [
    unique("runs_previous_run_id_key").on(table.previousRunId),
    unique("runs_invite_token_key").on(table.inviteToken),
    unique("runs_chain_attempt_key").on(table.chainId, table.attemptNumber),
    // char_length counts code points, as parseRunName does.
    check("runs_name_length", sql`char_length(${table.name}) BETWEEN 1 AND 60`),
    check(
      "runs_house_rules_length",
      sql`char_length(${table.houseRules}) <= 2000`
    ),
    check(
      "runs_waiting_is_soul_link",
      sql`${table.state} <> 'waiting' OR ${table.kind} = 'soul_link'`
    ),
    check(
      "runs_fail_cause_on_failed",
      sql`${table.failCause} IS NULL OR ${table.state} = 'failed'`
    ),
    check(
      "runs_finished_at_on_finished",
      sql`(${table.finishedAt} IS NOT NULL) = (${table.state} IN ('failed', 'complete'))`
    ),
    check(
      "runs_invite_token_on_waiting",
      sql`${table.inviteToken} IS NULL OR ${table.state} = 'waiting'`
    ),
    check(
      "runs_first_attempt_has_no_previous",
      sql`(${table.attemptNumber} = 1) = (${table.previousRunId} IS NULL)`
    ),
  ]
)

/** One Player's part of a Run, played on one Game of the Run's Map. */
export const journeys = pgTable(
  "journeys",
  {
    id: uuid("id").primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => users.id),
    gameId: text("game_id").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("journeys_run_player_key").on(table.runId, table.playerId),
    // The target of the composite foreign keys that keep each child row in
    // its own Run.
    unique("journeys_run_id_key").on(table.runId, table.id),
    index("journeys_player_run_idx").on(table.playerId, table.runId),
  ]
)

/** A Place that one Run adds; every Journey of the Run shares it. */
export const customPlaces = pgTable(
  "custom_places",
  {
    // A UUID v7 from the client, so its time orders a Place with no Encounter.
    id: uuid("id").primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
  },
  (table) => [unique("custom_places_run_id_key").on(table.runId, table.id)]
)

/** How the player got an Encounter's Pokémon. */
export const encounterOrigin = pgEnum("encounter_origin", ORIGINS)

/** Whether an Encounter gave a Pokémon. */
export const encounterOutcome = pgEnum("encounter_outcome", encounterOutcomes)

/**
 * One Encounter of a Journey, in a Slot at a Place of the Map or a Custom
 * Place. A Slot exists when an Encounter has it (ADR 0008).
 */
export const encounters = pgTable(
  "encounters",
  {
    // A UUID v7 from the client.
    id: uuid("id").primaryKey(),
    runId: uuid("run_id").notNull(),
    journeyId: uuid("journey_id").notNull(),
    placeId: text("place_id"),
    customPlaceId: uuid("custom_place_id"),
    slotOrdinal: integer("slot_ordinal").notNull(),
    origin: encounterOrigin("origin").notNull(),
    outcome: encounterOutcome("outcome").notNull(),
    speciesId: text("species_id"),
    formId: text("form_id"),
    enteredAt: timestamp("entered_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (table) => [
    foreignKey({
      name: "encounters_journey_fk",
      columns: [table.runId, table.journeyId],
      foreignColumns: [journeys.runId, journeys.id],
    }).onDelete("cascade"),
    // No action: a Custom Place cannot go while an Encounter names it.
    foreignKey({
      name: "encounters_custom_place_fk",
      columns: [table.runId, table.customPlaceId],
      foreignColumns: [customPlaces.runId, customPlaces.id],
    }),
    // The target of the Pokémon's composite foreign key.
    unique("encounters_journey_id_key").on(table.journeyId, table.id),
    // One Encounter per Journey per Slot; its violation is `slot-taken`.
    uniqueIndex("encounters_journey_place_slot_key")
      .on(table.journeyId, table.placeId, table.slotOrdinal)
      .where(sql`${table.placeId} IS NOT NULL`),
    uniqueIndex("encounters_journey_custom_place_slot_key")
      .on(table.journeyId, table.customPlaceId, table.slotOrdinal)
      .where(sql`${table.customPlaceId} IS NOT NULL`),
    index("encounters_run_place_idx").on(table.runId, table.placeId),
    check(
      "encounters_one_place",
      sql`(${table.placeId} IS NULL) <> (${table.customPlaceId} IS NULL)`
    ),
    check("encounters_slot_ordinal", sql`${table.slotOrdinal} >= 1`),
    check(
      "encounters_caught_has_species",
      sql`${table.outcome} <> 'caught' OR ${table.speciesId} IS NOT NULL`
    ),
    check(
      "encounters_species_with_form",
      sql`(${table.speciesId} IS NULL) = (${table.formId} IS NULL)`
    ),
  ]
)

/**
 * One Pokémon of a Journey, from exactly one Caught Encounter. A removed
 * Pokémon keeps its row, so its Encounter and history stay.
 */
export const pokemon = pgTable(
  "pokemon",
  {
    // A UUID v7 from the client.
    id: uuid("id").primaryKey(),
    journeyId: uuid("journey_id").notNull(),
    encounterId: uuid("encounter_id").notNull(),
    speciesId: text("species_id").notNull(),
    formId: text("form_id").notNull(),
    nickname: text("nickname"),
    inParty: boolean("in_party").notNull(),
    diedAt: timestamp("died_at", { withTimezone: true, mode: "date" }),
    deathLevel: integer("death_level"),
    deathCause: text("death_cause"),
    removedAt: timestamp("removed_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    foreignKey({
      name: "pokemon_encounter_fk",
      columns: [table.journeyId, table.encounterId],
      foreignColumns: [encounters.journeyId, encounters.id],
    }).onDelete("cascade"),
    unique("pokemon_encounter_id_key").on(table.encounterId),
    check(
      "pokemon_death_details_on_death",
      sql`(${table.deathLevel} IS NULL AND ${table.deathCause} IS NULL) OR ${table.diedAt} IS NOT NULL`
    ),
    // char_length counts code points, as the nickname schema does.
    check(
      "pokemon_nickname_length",
      sql`char_length(${table.nickname}) BETWEEN 1 AND 12`
    ),
  ]
)

/**
 * One evolution line of a Pokémon's history: the Species and Form it evolved
 * from and into. A correction edits or deletes the line (ADR 0008).
 */
export const evolutions = pgTable(
  "evolutions",
  {
    // A UUID v7 from the client.
    id: uuid("id").primaryKey(),
    pokemonId: uuid("pokemon_id")
      .notNull()
      .references(() => pokemon.id, { onDelete: "cascade" }),
    speciesFrom: text("species_from").notNull(),
    formFrom: text("form_from").notNull(),
    speciesTo: text("species_to").notNull(),
    formTo: text("form_to").notNull(),
    enteredAt: timestamp("entered_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  // Serves the Run load and the cascade; a foreign key makes no index.
  (table) => [index("evolutions_pokemon_id_idx").on(table.pokemonId)]
)
