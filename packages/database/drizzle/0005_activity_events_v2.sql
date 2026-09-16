ALTER TABLE "activity_events" ADD COLUMN "actor_id" uuid;
--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "actor_name" varchar(64);
--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "action" varchar(64);
--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "resource_type" varchar(64);
--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "resource_id" varchar(128);
--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "old_value" jsonb;
--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "new_value" jsonb;
--> statement-breakpoint

UPDATE "activity_events" SET
  "actor_id" = "user_id",
  "actor_name" = 'Unknown',
  "action" = COALESCE("type", 'unknown'),
  "resource_type" = 'unknown',
  "resource_id" = NULL;

--> statement-breakpoint

ALTER TABLE "activity_events" ALTER COLUMN "actor_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "activity_events" ALTER COLUMN "actor_name" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "activity_events" ALTER COLUMN "action" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "activity_events" ALTER COLUMN "resource_type" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

DROP INDEX IF EXISTS "activity_events_user_created_index";
--> statement-breakpoint
CREATE INDEX "activity_events_actor_created_index" ON "activity_events" USING btree ("actor_id", "created_at");
--> statement-breakpoint
CREATE INDEX "activity_events_action_index" ON "activity_events" USING btree ("action");
--> statement-breakpoint
CREATE INDEX "activity_events_resource_type_index" ON "activity_events" USING btree ("resource_type");
--> statement-breakpoint
CREATE INDEX "activity_events_guild_id_index" ON "activity_events" USING btree ("guild_id");
--> statement-breakpoint
CREATE INDEX "activity_events_plugin_id_index" ON "activity_events" USING btree ("plugin_id");
--> statement-breakpoint
CREATE INDEX "activity_events_created_at_index" ON "activity_events" USING btree ("created_at");
