import { asc, eq, sql } from 'drizzle-orm'
import {
  categories,
  products,
  stockMovements,
  warehouses,
} from '../db/schema'
import { db } from '../utils/inventory-db'

export default defineEventHandler(async () => {
  const stockTotals = db
    .select({
      productId: stockMovements.productId,
      quantity: sql<number>`
        COALESCE(SUM(${stockMovements.quantityChange}), 0)::integer
      `.as('quantity'),
    })
    .from(stockMovements)
    .groupBy(stockMovements.productId)
    .as('stock_totals')

  const warehouseBalances = db
    .select({
      productId: stockMovements.productId,
      warehouseId: stockMovements.warehouseId,
      quantity: sql<number>`
        COALESCE(SUM(${stockMovements.quantityChange}), 0)::integer
      `.as('quantity'),
    })
    .from(stockMovements)
    .groupBy(stockMovements.productId, stockMovements.warehouseId)
    .as('warehouse_balances')

  const warehouseNames = db
    .select({
      productId: warehouseBalances.productId,
      names: sql<string>`
        STRING_AGG(${warehouses.name}, ', ' ORDER BY ${warehouses.name})
      `.as('names'),
    })
    .from(warehouseBalances)
    .innerJoin(
      warehouses,
      eq(warehouseBalances.warehouseId, warehouses.id),
    )
    .where(sql`${warehouseBalances.quantity} > 0`)
    .groupBy(warehouseBalances.productId)
    .as('warehouse_names')

  return db
    .select({
      id: products.id,
      articleNumber: products.articleNumber,
      name: products.name,
      brand: products.brand,
      categoryName: categories.name,
      colour: products.colour,
      size: products.size,
      picture: products.picture,
      quantity: sql<number>`
        COALESCE(${stockTotals.quantity}, 0)
      `,
      warehouseName: warehouseNames.names,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(stockTotals, eq(products.id, stockTotals.productId))
    .leftJoin(warehouseNames, eq(products.id, warehouseNames.productId))
    .orderBy(asc(products.articleNumber))
})
