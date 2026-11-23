
import { asc, eq, sql } from 'drizzle-orm'
import { categories, products, stockMovements, warehouses } from '../../db/schema'
import { db } from '../../utils/inventory-db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid product ID' })
  }

  const [product] = await db
    .select({
      id: products.id,
      articleNumber: products.articleNumber,
      name: products.name,
      brand: products.brand,
      categoryId: products.categoryId,
      colour: products.colour,
      size: products.size,
      importer: products.importer,
      picture: products.picture,
      isActive: products.isActive,
    })
    .from(products)
    .where(eq(products.id, id))
    .limit(1)

  if (!product) {
    throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  }

  const categoryList = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.name))

  const warehouseList = await db
    .select({ id: warehouses.id, name: warehouses.name })
    .from(warehouses)
    .orderBy(asc(warehouses.name))

  const balances = await db
    .select({
      warehouseId: stockMovements.warehouseId,
      quantity: sql<number>`COALESCE(SUM(${stockMovements.quantityChange}), 0)::integer`,
    })
    .from(stockMovements)
    .where(eq(stockMovements.productId, id))
    .groupBy(stockMovements.warehouseId)

  const quantityMap = new Map(
    balances.map(item => [item.warehouseId, item.quantity]),
  )

  return {
    product,
    categories: categoryList,
    warehouses: warehouseList.map(warehouse => ({
      ...warehouse,
      quantity: quantityMap.get(warehouse.id) ?? 0,
    })),
  }
})
