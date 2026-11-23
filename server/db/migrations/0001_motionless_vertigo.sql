CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_number" varchar(100) NOT NULL,
	"brand" varchar(150) NOT NULL,
	"category_id" integer NOT NULL,
	"colour" varchar(100) NOT NULL,
	"size" varchar(50) NOT NULL,
	"price_yuan" numeric(12, 2) NOT NULL,
	"selling_price_npr" numeric(12, 2) NOT NULL,
	"importer" varchar(200) NOT NULL,
	"low_stock_alert" integer DEFAULT 20 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_article_colour_size_unique" UNIQUE("article_number","colour","size"),
	CONSTRAINT "product_price_yuan_positive" CHECK ("products"."price_yuan" >= 0),
	CONSTRAINT "product_price_npr_positive" CHECK ("products"."selling_price_npr" >= 0),
	CONSTRAINT "product_low_stock_nonnegative" CHECK ("products"."low_stock_alert" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"warehouse_id" integer NOT NULL,
	"rack_zone" varchar(100) NOT NULL,
	"movement_type" varchar(30) NOT NULL,
	"quantity_change" integer NOT NULL,
	"remarks" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stock_quantity_nonzero" CHECK ("stock_movements"."quantity_change" <> 0),
	CONSTRAINT "stock_movement_type_valid" CHECK ("stock_movements"."movement_type" IN (
      'IN',
      'OUT',
      'TRANSFER_IN',
      'TRANSFER_OUT',
      'ADJUSTMENT'
    ))
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"location" varchar(250),
	"description" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "warehouses_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stock_product_warehouse_idx" ON "stock_movements" USING btree ("product_id","warehouse_id");