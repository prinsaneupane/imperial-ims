
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export default defineEventHandler(async (event) => {
  // LOCAL DEVELOPMENT ONLY.
  // Secure this endpoint before deployment.
  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'picture')

  if (!file?.data) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Please select an image',
    })
  }

  if (file.data.length > 5 * 1024 * 1024) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Maximum image size is 5MB',
    })
  }

  const bytes = file.data

  const jpeg = bytes.length > 3
    && bytes[0] === 0xff
    && bytes[1] === 0xd8
    && bytes[2] === 0xff

  const png = bytes.length > 8
    && bytes.subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))

  const webp = bytes.length > 12
    && bytes.toString('ascii', 0, 4) === 'RIFF'
    && bytes.toString('ascii', 8, 12) === 'WEBP'

  const extension = jpeg
    ? 'jpg'
    : png
      ? 'png'
      : webp
        ? 'webp'
        : null

  if (!extension) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only JPG, PNG and WebP images are allowed',
    })
  }

  const folder = join(
    process.cwd(),
    'public',
    'uploads',
    'products',
  )

  await mkdir(folder, { recursive: true })

  const filename = `${randomUUID()}.${extension}`

  await writeFile(join(folder, filename), bytes, {
    flag: 'wx',
  })

  return {
    url: `/uploads/products/${filename}`,
  }
})
