CREATE TABLE "profiles" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"display_name" varchar(50) NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"address" varchar(200) NOT NULL,
	"type" varchar(20) NOT NULL,
	"start_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "magazines" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(150) NOT NULL,
	"summary" varchar(255),
	"content" text,
	"background_image_url" varchar(255) NOT NULL,
	"logo_image_url" varchar(255),
	"author_id" varchar(50) NOT NULL,
	"published_at" timestamp,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "magazines_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"label_ko" varchar(100) NOT NULL,
	"label_en" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_feature_screenshots" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"feature_id" varchar(26) NOT NULL,
	"product_id" varchar(26) NOT NULL,
	"image_url" varchar(255) NOT NULL,
	"image_alt" varchar(100) NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_features" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"product_id" varchar(26) NOT NULL,
	"name" varchar(100) NOT NULL,
	"emoji" varchar(30) NOT NULL,
	"summary" varchar(255),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_links" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"product_id" varchar(26) NOT NULL,
	"title" varchar(255) NOT NULL,
	"icon_url" varchar(255) NOT NULL,
	"link" varchar(255) NOT NULL,
	"display_link" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"summary" varchar(255) NOT NULL,
	"description" text,
	"logo_url" varchar(255) NOT NULL,
	"owned_company_id" varchar(26),
	"category_ids" json DEFAULT '[]'::json NOT NULL,
	"published_at" timestamp,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_screenshots" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"product_id" varchar(26) NOT NULL,
	"image_url" varchar(255) NOT NULL,
	"image_alt" varchar(100) NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_tags" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"product_id" varchar(26) NOT NULL,
	"tag_id" varchar(26) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "product_tags_product_id_tag_id_unique" UNIQUE("product_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(20) NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "alternative_products" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"product_id" varchar(26) NOT NULL,
	"alternative_product_id" varchar(26) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "alternative_products_product_id_alt_product_id_unique" UNIQUE("product_id","alternative_product_id")
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"locale" text NOT NULL,
	"field" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vote_records" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"target_id" varchar(26) NOT NULL,
	"voter_ip_hash" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vote_records_target_ip_unique" UNIQUE("target_id","voter_ip_hash")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"target_id" varchar(26) NOT NULL,
	"count" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "votes_target_id_unique" UNIQUE("target_id")
);
--> statement-breakpoint
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_translation" ON "translations" USING btree ("entity_type","entity_id","locale","field");--> statement-breakpoint
CREATE INDEX "entity_locale_idx" ON "translations" USING btree ("entity_type","entity_id","locale");--> statement-breakpoint
CREATE INDEX "vote_records_ip_time_idx" ON "vote_records" USING btree ("voter_ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "votes_count_idx" ON "votes" USING btree ("count" desc);