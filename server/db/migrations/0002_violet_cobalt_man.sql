ALTER TABLE "products" DROP CONSTRAINT "product_low_stock_nonnegative";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "name" varchar(200);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "picture" varchar(1000);--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "low_stock_alert";