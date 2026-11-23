
import {
  categories,
  products,
  warehouses,
} from '~~/server/db/schema'

export default defineNitroPlugin(() => {
  const registry = useAdminRegistry()

registry.register(products, {
  label: 'Add New Stock',
  icon: 'i-lucide-package-plus',
  order: 2,

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
  })
})
