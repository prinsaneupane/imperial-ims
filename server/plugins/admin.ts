import {
  categories,
  products,
  warehouses,
} from '~~/server/db/schema'

export default defineNitroPlugin(() => {
  const registry = useAdminRegistry()

  registry.register(products, {
    label: 'Products',
    icon: 'i-lucide-package',
    order: 2,

    // Stock must be received using the combined modal.
    create: {
      enabled: false,
    },

    // Prevent accidental product deletion.
    delete: {
      enabled: true,
    },

    fields: [
      {
        name: 'picture',
        type: 'image',
        label: 'Product Picture',
      },
    ],
  })

  registry.register(categories, {
    label: 'Categories',
    icon: 'i-lucide-tags',
    order: 1,
  })

  registry.register(warehouses, {
    label: 'Warehouses',
    icon: 'i-lucide-warehouse',
    order: 3,
    labelColumnName: 'name',
  })
})
