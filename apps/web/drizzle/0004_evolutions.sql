CREATE TABLE "evolutions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pokemon_id" uuid NOT NULL,
	"species_from" text NOT NULL,
	"form_from" text NOT NULL,
	"species_to" text NOT NULL,
	"form_to" text NOT NULL,
	"entered_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evolutions" ADD CONSTRAINT "evolutions_pokemon_id_pokemon_id_fk" FOREIGN KEY ("pokemon_id") REFERENCES "public"."pokemon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evolutions_pokemon_id_idx" ON "evolutions" USING btree ("pokemon_id");