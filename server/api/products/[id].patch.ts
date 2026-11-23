import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { categories, products, stockMovements, warehouses } from '../../db/schema'
import { db } from '../../utils/inventory-db'

const schema = z.object({
  articleNumber: z.string().trim().min(1),
  name: z.string().trim().min(1),
  brand: z.string().trim().min(1),
  categoryId: z.number().int().positive(),
  colour: z.string().trim().min(1),
  size: z.string().trim().min(1),
  importer: z.string().trim().min(1),
  picture: z.string().nullable(),
  isActive: z.boolean(),
  warehouseId: z.number().int().positive(),
  quantity: z.number().int().min(0),
})

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid product ID' })
  }

  const parsed = schema.safeParse(await readBody(event))

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Please check the product details and quantity.',
    })
  }

  const data = parsed.data

  return db.transaction(async (tx) => {
    // Lock this product while updating its stock.
    await tx.execute(
      sql`SELECT id FROM products WHERE id = ${id} FOR UPDATE`,
    )

    const [existing] = await tx
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, id))
      .limit(1)

    if (!existing) {
      throw createError({ statusCode: 404, statusMessage: 'Product not found' })
    }

    const [category] = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, data.categoryId))
      .limit(1)

    const [warehouse] = await tx
      .select({ id: warehouses.id })
      .from(warehouses)
      .where(eq(warehouses.id, data.warehouseId))
      .limit(1)

    if (!category || !warehouse) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid category or warehouse.',
      })
    }

    const [stock] = await tx
      .select({
        quantity: sql<number>`
          COALESCE(SUM(${stockMovements.quantityChange}), 0)::integer
        `,
      })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.productId, id),
          eq(stockMovements.warehouseId, data.warehouseId),
        ),
      )

    const previousQuantity = stock?.quantity ?? 0
    const difference = data.quantity - previousQuantity

    await tx
      .update(products)
      .set({
        articleNumber: data.articleNumber,
        name: data.name,
        brand: data.brand,
        categoryId: data.categoryId,
        colour: data.colour,
        size: data.size,
        importer: data.importer,
        picture: data.picture,
        isActive: data.isActive,
      })
      .where(eq(products.id, id))

    if (difference !== 0) {
      await tx.insert(stockMovements).values({
        productId: id,
        warehouseId: data.warehouseId,
        movementType: 'ADJUSTMENT',
        quantityChange: difference,
        remarks: `Manual stock adjustment: ${previousQuantity} to ${data.quantity} pairs`,
      })
    }

    return {
      success: true,
      previousQuantity,
      quantity: data.quantity,
    }
  })
})
