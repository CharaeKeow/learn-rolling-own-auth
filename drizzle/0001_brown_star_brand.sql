ALTER TABLE "user" ADD COLUMN "githubId" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "username" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_githubId_unique" UNIQUE("githubId");