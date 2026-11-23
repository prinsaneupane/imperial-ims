
import { asc } from 'drizzle-orm'
import { db } from '../utils/inventory-db'
import { warehouses } from '../db/schema'

export default defineEventHandler(async () => {
  return await db
    .select({
      id: warehouses.id,
      name: warehouses.name,
    })
    .from(warehouses)
    .orderBy(asc(warehouses.name))
})
