CREATE TABLE "llm_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"endpoint" text DEFAULT 'https://openrouter.ai/api/v1' NOT NULL,
	"api_key" text,
	"model" text DEFAULT 'nvidia/nemotron-3-ultra-550b-a55b:free' NOT NULL,
	"thinking_level" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
