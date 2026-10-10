CREATE TYPE "public"."run_kind" AS ENUM('solo', 'soul_link');--> statement-breakpoint
CREATE TYPE "public"."run_state" AS ENUM('waiting', 'active', 'failed', 'complete');--> statement-breakpoint
CREATE TYPE "public"."run_visibility" AS ENUM('private', 'link');--> statement-breakpoint
CREATE TABLE "headcanon_mutation_receipts" (
	"actor_scope" text NOT NULL,
	"mutation_id" uuid NOT NULL,
	"protocol" text NOT NULL,
	"canonical_invocation" text NOT NULL,
	"canonical_fingerprint" char(64) NOT NULL,
	"terminal_outcome" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "headcanon_mutation_receipts_actor_scope_mutation_id_pk" PRIMARY KEY("actor_scope","mutation_id")
);
--> statement-breakpoint
CREATE TABLE "journeys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"run_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"game_id" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "journeys_run_player_key" UNIQUE("run_id","player_id"),
	CONSTRAINT "journeys_run_id_key" UNIQUE("run_id","id")
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" "run_kind" NOT NULL,
	"state" "run_state" NOT NULL,
	"name" text NOT NULL,
	"map_id" text NOT NULL,
	"visibility" "run_visibility" DEFAULT 'private' NOT NULL,
	"rules" jsonb NOT NULL,
	"house_rules" text,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"fail_cause" text,
	"last_changed_at" timestamp with time zone NOT NULL,
	"revision" bigint NOT NULL,
	"previous_run_id" uuid,
	"chain_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"invite_token" text,
	CONSTRAINT "runs_previous_run_id_key" UNIQUE("previous_run_id"),
	CONSTRAINT "runs_invite_token_key" UNIQUE("invite_token"),
	CONSTRAINT "runs_chain_attempt_key" UNIQUE("chain_id","attempt_number"),
	CONSTRAINT "runs_name_length" CHECK (char_length("runs"."name") BETWEEN 1 AND 60),
	CONSTRAINT "runs_house_rules_length" CHECK (char_length("runs"."house_rules") <= 2000),
	CONSTRAINT "runs_waiting_is_soul_link" CHECK ("runs"."state" <> 'waiting' OR "runs"."kind" = 'soul_link'),
	CONSTRAINT "runs_fail_cause_on_failed" CHECK ("runs"."fail_cause" IS NULL OR "runs"."state" = 'failed'),
	CONSTRAINT "runs_finished_at_on_finished" CHECK (("runs"."finished_at" IS NOT NULL) = ("runs"."state" IN ('failed', 'complete'))),
	CONSTRAINT "runs_invite_token_on_waiting" CHECK ("runs"."invite_token" IS NULL OR "runs"."state" = 'waiting'),
	CONSTRAINT "runs_first_attempt_has_no_previous" CHECK (("runs"."attempt_number" = 1) = ("runs"."previous_run_id" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_player_id_users_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_previous_run_id_runs_id_fk" FOREIGN KEY ("previous_run_id") REFERENCES "public"."runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_chain_id_runs_id_fk" FOREIGN KEY ("chain_id") REFERENCES "public"."runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "headcanon_mutation_receipts_created_at_idx" ON "headcanon_mutation_receipts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "journeys_player_run_idx" ON "journeys" USING btree ("player_id","run_id");