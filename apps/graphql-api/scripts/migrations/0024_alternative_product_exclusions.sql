CREATE TABLE "alternative_product_exclusions" (
	"product_id" varchar(26) NOT NULL,
	"alternative_product_id" varchar(26) NOT NULL,
	"note" varchar(500),
	CONSTRAINT "alternative_product_exclusions_product_id_alternative_product_id_pk" PRIMARY KEY("product_id","alternative_product_id"),
	CONSTRAINT "alternative_product_exclusions_distinct_products" CHECK ("alternative_product_exclusions"."product_id" <> "alternative_product_exclusions"."alternative_product_id")
);
