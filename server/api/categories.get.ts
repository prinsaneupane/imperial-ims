
import { asc } from 'drizzle-orm'
import { db } from '../utils/inventory-db'
import { categories } from '../db/schema'

export default defineEventHandler(async () => {
  return db
    .select({
      id: categories.id,
      name: categories.name,
    })
    .from(categories)
    .orderBy(asc(categories.name))
})
