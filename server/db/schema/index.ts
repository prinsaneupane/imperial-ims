import { sql } from 'drizzle-orm'
import {
  pgTable,
  serial,
  integer,
  varchar,
  numeric,
  timestamp,
  boolean,
  unique,
  check,
  index,
} from 'drizzle-orm/pg-core'

// 1. CATEGORIES
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),

  name: varchar('name', { length: 150 })
    .notNull()
    .unique(),

  description: varchar('description', { length: 500 }),

  createdAt: timestamp('created_at')
    .defaultNow()
    .notNull(),
})

// 2. PRODUCTS
export const products = pgTable('products', {
  id: serial('id').primaryKey(),

  articleNumber: varchar('article_number', {
    length: 100,
  }).notNull(),

  name: varchar('name', { length: 200 }),

  brand: varchar('brand', {
    length: 150,
  }).notNull(),

  categoryId: integer('category_id')
    .notNull()
    .references(() => categories.id),

  colour: varchar('colour', {
    length: 100,
  }).notNull(),

  // Size is TEXT, not an integer
  size: varchar('size', {
    length: 50,
  }).notNull(),

  priceYuan: numeric('price_yuan', {
    precision: 12,
    scale: 2,
  }).notNull().default('0'),

  sellingPriceNpr: numeric('selling_price_npr', {
    precision: 12,
    scale: 2,
  }).notNull().default('0'),

  importer: varchar('importer', {
    length: 200,
  }).notNull(),

  picture: varchar('picture', { length: 1000 }),

  isActive: boolean('is_active')
    .notNull()
    .default(true),

  createdAt: timestamp('created_at')
    .defaultNow()
    .notNull(),
}, table => [
  unique('product_article_colour_size_unique').on(
    table.articleNumber,
    table.colour,
    table.size,
  ),
  check('product_price_yuan_positive',
    sql`${table.priceYuan} >= 0`),
  check('product_price_npr_positive',
    sql`${table.sellingPriceNpr} >= 0`),

])

// 3. WAREHOUSES
export const warehouses = pgTable('warehouses', {
  id: serial('id').primaryKey(),

  name: varchar('name', {
    length: 150,
  }).notNull().unique(),

  location: varchar('location', {
    length: 250,
  }),

  description: varchar('description', {
    length: 500,
  }),

  isActive: boolean('is_active')
    .notNull()
    .default(true),

  createdAt: timestamp('created_at')
    .defaultNow()
    .notNull(),
})

// 4. STOCK MOVEMENTS
export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),

  productId: integer('product_id')
    .notNull()
    .references(() => products.id),

  warehouseId: integer('warehouse_id')
    .notNull()
    .references(() => warehouses.id),

  // IN, OUT, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT
  movementType: varchar('movement_type', {
    length: 30,
  }).notNull(),

  // Positive = incoming, negative = outgoing
  quantityChange: integer('quantity_change')
    .notNull(),

  remarks: varchar('remarks', {
    length: 500,
  }),

  createdAt: timestamp('created_at')
    .defaultNow()
    .notNull(),
}, table => [
  index('stock_product_warehouse_idx').on(
    table.productId,
    table.warehouseId,
  ),
  check('stock_quantity_nonzero',
    sql`${table.quantityChange} <> 0`),
  check('stock_movement_type_valid',
    sql`${table.movementType} IN (
      'IN',
      'OUT',
      'TRANSFER_IN',
      'TRANSFER_OUT',
      'ADJUSTMENT'
    )`),
])
