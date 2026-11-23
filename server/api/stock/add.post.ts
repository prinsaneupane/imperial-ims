import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../../utils/inventory-db'
import {
  categories,
  products,
  warehouses,
  stockMovements,
} from '../../db/schema'

const schema = z.object({
  articleNumber: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  brand: z.string().trim().min(1).max(150),
  categoryId: z.number().int().positive(),
  colour: z.string().trim().min(1).max(100),
  size: z.string().trim().min(1).max(50),
  importer: z.string().trim().min(1).max(200),
  picture: z.string().max(1000).nullable().optional(),
  warehouseId: z.number().int().positive(),
  quantity: z.number().int().positive(),
})

export default defineEventHandler(async (event) => {
  // LOCAL DEVELOPMENT ONLY.
  // Add authentication and role checks before deployment.

  const result = schema.safeParse(await readBody(event))

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid stock information',
    })
  }

  const data = result.data

  return db.transaction(async (tx) => {
    const [category] = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, data.categoryId))
      .limit(1)

    if (!category) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid category',
      })
    }

    const [warehouse] = await tx
      .select({ id: warehouses.id })
      .from(warehouses)
      .where(and(
        eq(warehouses.id, data.warehouseId),
        eq(warehouses.isActive, true),
      ))
      .limit(1)

    if (!warehouse) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid warehouse',
      })
    }

    const [inserted] = await tx
      .insert(products)
      .values({
        articleNumber: data.articleNumber,
        name: data.name,
        brand: data.brand,
        categoryId: data.categoryId,
        colour: data.colour,
        size: data.size,
        importer: data.importer,
        picture: data.picture || null,
      })
      .onConflictDoNothing({
        target: [
          products.articleNumber,
          products.colour,
          products.size,
        ],
      })
      .returning({ id: products.id })

    const [product] = inserted
      ? [inserted]
      : await tx
          .select({ id: products.id })
          .from(products)
          .where(and(
            eq(products.articleNumber, data.articleNumber),
            eq(products.colour, data.colour),
            eq(products.size, data.size),
          ))
          .limit(1)

    if (!product) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Product could not be resolved',
      })
    }

    const [movement] = await tx
      .insert(stockMovements)
      .values({
        productId: product.id,
        warehouseId: data.warehouseId,
        movementType: 'IN',
        quantityChange: data.quantity,
        remarks: 'Stock received',
      })
      .returning({ id: stockMovements.id })

    return {
      success: true,
      productId: product.id,
      movementId: movement.id,
      quantityAdded: data.quantity,
      message: 'Stock added successfully',
    }
  })
})
