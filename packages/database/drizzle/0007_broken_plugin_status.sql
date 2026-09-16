DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum
        WHERE enumlabel = 'BROKEN'
          AND enumtypid = 'public.plugin_status'::regtype
    ) THEN
        ALTER TYPE "public"."plugin_status" ADD VALUE 'BROKEN';
    END IF;
END $$;

ALTER TABLE "plugins" ADD COLUMN IF NOT EXISTS "broken_reason" varchar(255);
