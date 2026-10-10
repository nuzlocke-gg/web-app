import { sql } from "drizzle-orm"
import {
  bigint,
  boolean,
  check,
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
import type { AdapterAccountType } from "next-auth/adapters"

import { runKinds, runLifeStates, runVisibilities } from "../runs/state"

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
