CREATE TYPE "public"."plugin_log_level" AS ENUM('DEBUG', 'INFO', 'WARN', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."plugin_status" AS ENUM('INSTALLED', 'ERROR');--> statement-breakpoint
CREATE TABLE "guild_plugins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"plugin_id" varchar(64) NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"installed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plugin_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"plugin_id" varchar(64) NOT NULL,
	"level" "plugin_log_level" NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plugin_migrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plugin_id" varchar(64) NOT NULL,
	"migration_name" varchar(255) NOT NULL,
	"checksum" varchar(128) NOT NULL,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plugins" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"version" varchar(64) NOT NULL,
	"description" text NOT NULL,
	"author" varchar(100) NOT NULL,
	"status" "plugin_status" DEFAULT 'INSTALLED' NOT NULL,
	"installed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guild_plugins" ADD CONSTRAINT "guild_plugins_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_plugins" ADD CONSTRAINT "guild_plugins_plugin_id_plugins_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."plugins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plugin_logs" ADD CONSTRAINT "plugin_logs_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plugin_logs" ADD CONSTRAINT "plugin_logs_plugin_id_plugins_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."plugins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plugin_migrations" ADD CONSTRAINT "plugin_migrations_plugin_id_plugins_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."plugins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "guild_plugins_guild_plugin_unique" ON "guild_plugins" USING btree ("guild_id","plugin_id");--> statement-breakpoint
CREATE INDEX "guild_plugins_guild_id_index" ON "guild_plugins" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "plugin_logs_guild_plugin_created_index" ON "plugin_logs" USING btree ("guild_id","plugin_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "plugin_migrations_plugin_name_unique" ON "plugin_migrations" USING btree ("plugin_id","migration_name");