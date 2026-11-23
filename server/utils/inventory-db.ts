
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../db/schema'

const connectionString = process.env.NUXT_DATABASE_URL

if (!connectionString) {
  throw new Error('NUXT_DATABASE_URL is missing')
}

const globalForDb = globalThis as unknown as {
  inventoryPool?: Pool
}

const pool = globalForDb.inventoryPool ?? new Pool({
  connectionString,
})

globalForDb.inventoryPool = pool

export const db = drizzle(pool, { schema })
