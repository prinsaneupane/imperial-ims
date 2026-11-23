import { eq } from 'drizzle-orm'
import { products, stockMovements } from '../../db/schema'
import { db } from '../../utils/inventory-db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid product ID',
    })
  }

  const [movement] = await db
    .select({ id: stockMovements.id })
    .from(stockMovements)
    .where(eq(stockMovements.productId, id))
    .limit(1)

  if (movement) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Product has stock history. Deactivate it instead of deleting.',
    })
  }

  const [deleted] = await db
    .delete(products)
    .where(eq(products.id, id))
    .returning({ id: products.id })

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Product not found',
    })
  }

  return { success: true }
})
