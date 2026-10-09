import { sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import type { AdapterAccountType } from "next-auth/adapters"

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
