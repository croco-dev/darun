CREATE INDEX "product_flows_product_id_flow_id_idx" ON "product_flows" USING btree ("product_id","id");--> statement-breakpoint
DROP INDEX "product_flows_product_id_idx";
