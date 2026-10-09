BEGIN;
CREATE SCHEMA IF NOT EXISTS vita;
SET LOCAL search_path TO vita;
CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"city" text NOT NULL,
	CONSTRAINT "company_kind" CHECK("companies"."kind" in ('hemocentro','hospital'))
);
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON UPDATE no action ON DELETE no action,
	CONSTRAINT "user_role" CHECK("users"."role" in ('admin','operator','reader'))
);
CREATE TABLE "sessions" (
	"hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" bigint NOT NULL,
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action
);
CREATE TABLE "auth_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" bigint NOT NULL
);
CREATE TABLE "connections" (
	"id" text PRIMARY KEY NOT NULL,
	"hospital_id" text NOT NULL,
	"center_id" text NOT NULL,
	"requested_by" text NOT NULL,
	"status" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	FOREIGN KEY ("hospital_id") REFERENCES "companies"("id") ON UPDATE no action ON DELETE no action,
	FOREIGN KEY ("center_id") REFERENCES "companies"("id") ON UPDATE no action ON DELETE no action,
	FOREIGN KEY ("requested_by") REFERENCES "companies"("id") ON UPDATE no action ON DELETE no action,
	CONSTRAINT "connection_status" CHECK("connections"."status" in ('pending','accepted','rejected'))
);
CREATE TABLE "stocks" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"component" text NOT NULL,
	"blood_type" text NOT NULL,
	"available" integer NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"updated_at" bigint NOT NULL,
	FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON UPDATE no action ON DELETE no action,
	CONSTRAINT "stock_nonnegative" CHECK("stocks"."available">=0 and "stocks"."reserved">=0)
);
CREATE TABLE "requests" (
	"id" text PRIMARY KEY NOT NULL,
	"hospital_id" text NOT NULL,
	"center_id" text NOT NULL,
	"created_by" text NOT NULL,
	"component" text NOT NULL,
	"blood_type" text NOT NULL,
	"quantity" integer NOT NULL,
	"priority" text NOT NULL,
	"needed_by" text NOT NULL,
	"note" text NOT NULL,
	"status" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	FOREIGN KEY ("hospital_id") REFERENCES "companies"("id") ON UPDATE no action ON DELETE no action,
	FOREIGN KEY ("center_id") REFERENCES "companies"("id") ON UPDATE no action ON DELETE no action,
	FOREIGN KEY ("created_by") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action,
	CONSTRAINT "request_quantity" CHECK("requests"."quantity">0),
	CONSTRAINT "request_status" CHECK("requests"."status" in ('sent','accepted','rejected','dispatched','received','cancelled'))
);
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"user_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" bigint NOT NULL,
	FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON UPDATE no action ON DELETE no action,
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action,
 "sequence" bigint NOT NULL DEFAULT 0
);
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"note" text NOT NULL,
	"created_at" bigint NOT NULL,
	FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON UPDATE no action ON DELETE no action,
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action,
 "sequence" bigint NOT NULL DEFAULT 0
);
CREATE TABLE "audit" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"target_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON UPDATE no action ON DELETE no action,
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action
);
CREATE TABLE "setup" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
CREATE UNIQUE INDEX "connection_pair" ON "connections" ("hospital_id","center_id");
CREATE INDEX "request_events" ON "events" ("request_id");
CREATE INDEX "request_messages" ON "messages" ("request_id");
CREATE INDEX "hospital_requests" ON "requests" ("hospital_id");
CREATE INDEX "center_requests" ON "requests" ("center_id");
CREATE INDEX "session_expiry" ON "sessions" ("expires_at");
CREATE UNIQUE INDEX "stock_item" ON "stocks" ("company_id","component","blood_type");
CREATE UNIQUE INDEX "user_email" ON "users" ("email");

-- Only the server connects with the database credential. No anonymous or
-- authenticated browser API grants exist in this dedicated schema.
REVOKE ALL ON SCHEMA vita FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA vita FROM PUBLIC, anon, authenticated;
ALTER TABLE vita."companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE vita."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE vita."sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE vita."auth_limits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE vita."connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE vita."stocks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE vita."requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE vita."messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE vita."events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE vita."audit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE vita."setup" ENABLE ROW LEVEL SECURITY;
COMMIT;
