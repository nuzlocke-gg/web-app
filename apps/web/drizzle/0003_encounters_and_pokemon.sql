CREATE TYPE "public"."encounter_origin" AS ENUM('wild', 'gift', 'trade');--> statement-breakpoint
CREATE TYPE "public"."encounter_outcome" AS ENUM('caught', 'failed');--> statement-breakpoint
CREATE TABLE "custom_places" (
	"id" uuid PRIMARY KEY NOT NULL,
	"run_id" uuid NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "custom_places_run_id_key" UNIQUE("run_id","id")
);
--> statement-breakpoint
CREATE TABLE "encounters" (
	"id" uuid PRIMARY KEY NOT NULL,
	"run_id" uuid NOT NULL,
	"journey_id" uuid NOT NULL,
	"place_id" text,
	"custom_place_id" uuid,
	"slot_ordinal" integer NOT NULL,
	"origin" "encounter_origin" NOT NULL,
	"outcome" "encounter_outcome" NOT NULL,
	"species_id" text,
	"form_id" text,
	"entered_at" timestamp with time zone NOT NULL,
	CONSTRAINT "encounters_journey_id_key" UNIQUE("journey_id","id"),
	CONSTRAINT "encounters_one_place" CHECK (("encounters"."place_id" IS NULL) <> ("encounters"."custom_place_id" IS NULL)),
	CONSTRAINT "encounters_slot_ordinal" CHECK ("encounters"."slot_ordinal" >= 1),
	CONSTRAINT "encounters_caught_has_species" CHECK ("encounters"."outcome" <> 'caught' OR "encounters"."species_id" IS NOT NULL),
	CONSTRAINT "encounters_species_with_form" CHECK (("encounters"."species_id" IS NULL) = ("encounters"."form_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "pokemon" (
	"id" uuid PRIMARY KEY NOT NULL,
	"journey_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"species_id" text NOT NULL,
	"form_id" text NOT NULL,
	"nickname" text,
	"in_party" boolean NOT NULL,
	"died_at" timestamp with time zone,
	"death_level" integer,
	"death_cause" text,
	"removed_at" timestamp with time zone,
	CONSTRAINT "pokemon_encounter_id_key" UNIQUE("encounter_id"),
	CONSTRAINT "pokemon_death_details_on_death" CHECK (("pokemon"."death_level" IS NULL AND "pokemon"."death_cause" IS NULL) OR "pokemon"."died_at" IS NOT NULL),
	CONSTRAINT "pokemon_nickname_length" CHECK (char_length("pokemon"."nickname") BETWEEN 1 AND 12)
);
--> statement-breakpoint
ALTER TABLE "custom_places" ADD CONSTRAINT "custom_places_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_journey_fk" FOREIGN KEY ("run_id","journey_id") REFERENCES "public"."journeys"("run_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_custom_place_fk" FOREIGN KEY ("run_id","custom_place_id") REFERENCES "public"."custom_places"("run_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pokemon" ADD CONSTRAINT "pokemon_encounter_fk" FOREIGN KEY ("journey_id","encounter_id") REFERENCES "public"."encounters"("journey_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "encounters_journey_place_slot_key" ON "encounters" USING btree ("journey_id","place_id","slot_ordinal") WHERE "encounters"."place_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "encounters_journey_custom_place_slot_key" ON "encounters" USING btree ("journey_id","custom_place_id","slot_ordinal") WHERE "encounters"."custom_place_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "encounters_run_place_idx" ON "encounters" USING btree ("run_id","place_id");