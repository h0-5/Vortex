CREATE TYPE "public"."plugin_command_type" AS ENUM('SLASH', 'PREFIX', 'BOTH');--> statement-breakpoint
CREATE TYPE "public"."plugin_log_destination" AS ENUM('DASHBOARD', 'DISCORD', 'BOTH', 'DISABLED');--> statement-breakpoint
CREATE TYPE "public"."plugin_log_output_type" AS ENUM('text', 'embed', 'components_v2');--> statement-breakpoint
CREATE TYPE "public"."template_content_mode" AS ENUM('text', 'embed', 'components_v2', 'visual_card');--> statement-breakpoint
ALTER TYPE "public"."plugin_log_level" ADD VALUE 'AUDIT';--> statement-breakpoint
CREATE TABLE "command_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"plugin_id" varchar(64) NOT NULL,
	"command_id" varchar(64) NOT NULL,
	"alias" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "command_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"plugin_id" varchar(64) NOT NULL,
	"command_id" varchar(64) NOT NULL,
	"user_id" varchar(20) NOT NULL,
	"channel_id" varchar(20) NOT NULL,
	"status" varchar(32) NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "command_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"plugin_id" varchar(64) NOT NULL,
	"command_id" varchar(64) NOT NULL,
	"allowed_role_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ignored_role_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ignored_channel_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enabled_channel_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guild_plugin_commands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"plugin_id" varchar(64) NOT NULL,
	"command_id" varchar(64) NOT NULL,
	"name" varchar(32) NOT NULL,
	"description" varchar(100) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"auto_delete_reply_on_author_delete" boolean DEFAULT false NOT NULL,
	"auto_delete_author_message" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guild_plugin_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"plugin_id" varchar(64) NOT NULL,
	"template_id" uuid NOT NULL,
	"content" jsonb NOT NULL,
	"preview_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plugin_commands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"plugin_id" varchar(64) NOT NULL,
	"command_id" varchar(64) NOT NULL,
	"default_name" varchar(32) NOT NULL,
	"default_description" varchar(100) NOT NULL,
	"type" "plugin_command_type" NOT NULL,
	"default_permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"auto_delete_reply_on_author_delete" boolean DEFAULT false NOT NULL,
	"auto_delete_author_message" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plugin_log_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"plugin_id" varchar(64) NOT NULL,
	"destination" "plugin_log_destination" DEFAULT 'DASHBOARD' NOT NULL,
	"channel_id" varchar(20),
	"output_type" "plugin_log_output_type" DEFAULT 'text' NOT NULL,
	"embed_color" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plugin_storage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"plugin_id" varchar(64) NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plugin_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"plugin_id" varchar(64) NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(64) NOT NULL,
	"content_mode" "template_content_mode" NOT NULL,
	"content" jsonb NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preview_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"plugin_id" varchar(64) NOT NULL,
	"template_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plugin_logs" ADD COLUMN "destination" "plugin_log_destination" DEFAULT 'DASHBOARD' NOT NULL;--> statement-breakpoint
ALTER TABLE "command_aliases" ADD CONSTRAINT "command_aliases_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_aliases" ADD CONSTRAINT "command_aliases_plugin_id_plugins_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."plugins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_logs" ADD CONSTRAINT "command_logs_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_logs" ADD CONSTRAINT "command_logs_plugin_id_plugins_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."plugins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_permissions" ADD CONSTRAINT "command_permissions_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_permissions" ADD CONSTRAINT "command_permissions_plugin_id_plugins_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."plugins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_plugin_commands" ADD CONSTRAINT "guild_plugin_commands_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_plugin_commands" ADD CONSTRAINT "guild_plugin_commands_plugin_id_plugins_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."plugins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_plugin_templates" ADD CONSTRAINT "guild_plugin_templates_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_plugin_templates" ADD CONSTRAINT "guild_plugin_templates_plugin_id_plugins_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."plugins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_plugin_templates" ADD CONSTRAINT "guild_plugin_templates_template_id_plugin_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."plugin_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plugin_commands" ADD CONSTRAINT "plugin_commands_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plugin_commands" ADD CONSTRAINT "plugin_commands_plugin_id_plugins_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."plugins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plugin_log_settings" ADD CONSTRAINT "plugin_log_settings_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plugin_log_settings" ADD CONSTRAINT "plugin_log_settings_plugin_id_plugins_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."plugins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plugin_storage" ADD CONSTRAINT "plugin_storage_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plugin_storage" ADD CONSTRAINT "plugin_storage_plugin_id_plugins_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."plugins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plugin_templates" ADD CONSTRAINT "plugin_templates_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plugin_templates" ADD CONSTRAINT "plugin_templates_plugin_id_plugins_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."plugins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_plugin_id_plugins_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."plugins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_template_id_plugin_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."plugin_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "command_aliases_guild_alias_unique" ON "command_aliases" USING btree ("guild_id","alias");--> statement-breakpoint
CREATE INDEX "command_aliases_scope_command_index" ON "command_aliases" USING btree ("guild_id","plugin_id","command_id");--> statement-breakpoint
CREATE INDEX "command_logs_scope_created_index" ON "command_logs" USING btree ("guild_id","plugin_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "command_permissions_scope_command_unique" ON "command_permissions" USING btree ("guild_id","plugin_id","command_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guild_plugin_commands_scope_command_unique" ON "guild_plugin_commands" USING btree ("guild_id","plugin_id","command_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guild_plugin_commands_guild_name_unique" ON "guild_plugin_commands" USING btree ("guild_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "guild_plugin_templates_scope_template_unique" ON "guild_plugin_templates" USING btree ("guild_id","plugin_id","template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plugin_commands_scope_command_unique" ON "plugin_commands" USING btree ("guild_id","plugin_id","command_id");--> statement-breakpoint
CREATE INDEX "plugin_commands_scope_index" ON "plugin_commands" USING btree ("guild_id","plugin_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plugin_log_settings_guild_plugin_unique" ON "plugin_log_settings" USING btree ("guild_id","plugin_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plugin_storage_scope_key_unique" ON "plugin_storage" USING btree ("guild_id","plugin_id","key");--> statement-breakpoint
CREATE INDEX "plugin_storage_scope_index" ON "plugin_storage" USING btree ("guild_id","plugin_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plugin_templates_scope_name_unique" ON "plugin_templates" USING btree ("guild_id","plugin_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "template_versions_scope_version_unique" ON "template_versions" USING btree ("guild_id","plugin_id","template_id","version");