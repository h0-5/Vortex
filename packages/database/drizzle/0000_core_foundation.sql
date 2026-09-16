CREATE TYPE "public"."guild_permission_role" AS ENUM('OWNER', 'ADMINISTRATOR', 'MANAGER');--> statement-breakpoint
CREATE TABLE "guild_members" (
	"guild_id" varchar(20) NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "guild_permission_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guild_members_guild_id_user_id_pk" PRIMARY KEY("guild_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "guilds" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"icon" varchar(128),
	"owner_id" varchar(20) NOT NULL,
	"bot_present" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(32) NOT NULL,
	"provider_account_id" varchar(128) NOT NULL,
	"access_token_ciphertext" text NOT NULL,
	"access_token_iv" varchar(32) NOT NULL,
	"access_token_auth_tag" varchar(32) NOT NULL,
	"refresh_token_ciphertext" text NOT NULL,
	"refresh_token_iv" varchar(32) NOT NULL,
	"refresh_token_auth_tag" varchar(32) NOT NULL,
	"scopes" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp (6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discord_id" varchar(20) NOT NULL,
	"username" varchar(32) NOT NULL,
	"avatar" varchar(128),
	"global_name" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guild_members_user_id_index" ON "guild_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "guilds_owner_id_index" ON "guilds" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_accounts_provider_account_unique" ON "oauth_accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_accounts_user_provider_unique" ON "oauth_accounts" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "user_sessions_expire_index" ON "user_sessions" USING btree ("expire");--> statement-breakpoint
CREATE UNIQUE INDEX "users_discord_id_unique" ON "users" USING btree ("discord_id");