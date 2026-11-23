<script setup lang="ts">
import OriginalAutoAdmin from '#layers/autoadmin/components/AutoAdmin.vue'
import AutoFormModal from '#layers/autoadmin/components/AutoFormModal.vue'
import AddStockModal from '~/components/inventory/AddStockModal.vue'
import EditProductModal from '~/components/inventory/EditProductModal.vue'

type Product = {
  id: number
  articleNumber: string
  name: string | null
  brand: string
  categoryName: string | null
  colour: string
  size: string
  picture: string | null
  quantity: number
  warehouseName: string | null
}

const route = useRoute()
const overlay = useOverlay()

const showAddStock = ref(false)
const viewMode = ref<'cards' | 'table'>('cards')
const deletingId = ref<number | null>(null)
const errorMessage = ref('')
const showEditProduct = ref(false)
const editingProductId = ref<number | null>(null)

const isProductsPage = computed(() =>
  route.path.toLowerCase().split('/').includes('products'),
)

const {
  data: productList,
  refresh: refreshProducts,
  status,
} = useFetch<Product[]>('/api/products', {
  immediate: false,
  default: () => [],
})

watch(
  isProductsPage,
  async (visible) => {
    if (visible) {
      await refreshProducts()
    }
  },
  { immediate: true },
)

async function refreshPage() {
  await refreshProducts()
  await refreshNuxtData()
}

async function stockSaved() {
  showAddStock.value = false
  await refreshPage()
}

function editProduct(product: Product) {
  editingProductId.value = product.id
  showEditProduct.value = true
}

async function productUpdated() {
  showEditProduct.value = false
  editingProductId.value = null
  await refreshPage()
}

async function deleteProduct(product: Product) {
  const confirmed = window.confirm(
    `Are you sure you want to delete ${product.articleNumber}?`,
  )

  if (!confirmed)
    return

  deletingId.value = product.id
  errorMessage.value = ''

  try {
    await $fetch(`/api/products/${product.id}`, {
      method: 'DELETE',
    })

    await refreshPage()
  }
  catch (error: unknown) {
    const fetchError = error as {
      data?: { statusMessage?: string }
      message?: string
    }

    errorMessage.value = fetchError.data?.statusMessage
      || fetchError.message
      || 'Failed to delete product.'
  }
  finally {
    deletingId.value = null
  }
}
</script>

<template>
  <OriginalAutoAdmin>
    <!-- Products toolbar -->
    <div
      v-if="isProductsPage"
      class="mb-5 flex flex-wrap items-center justify-between gap-3"
    >
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-layout-grid"
          color="neutral"
          :variant="viewMode === 'cards' ? 'solid' : 'outline'"
          @click="viewMode = 'cards'"
        >
          Cards
        </UButton>

        <UButton
          icon="i-lucide-list"
          color="neutral"
          :variant="viewMode === 'table' ? 'solid' : 'outline'"
          @click="viewMode = 'table'"
        >
          Table
        </UButton>
      </div>

      <UButton
        icon="i-lucide-plus"
        color="primary"
        size="lg"
        @click="showAddStock = true"
      >
        Add New Stock
      </UButton>
    </div>

    <!-- Product cards -->
    <div
      v-if="isProductsPage && viewMode === 'cards'"
      class="space-y-4"
    >
      <div
        v-if="errorMessage"
        class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </div>

      <div
        v-if="status === 'pending'"
        class="py-10 text-center text-gray-500"
      >
        Loading products...
      </div>

      <div
        v-else-if="!productList?.length"
        class="rounded-xl border border-gray-200 p-10 text-center text-gray-500"
      >
        No products found.
      </div>

      <div
        v-else
        class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
      >
        <div
          v-for="product in productList"
          :key="product.id"
          class="group flex h-[325px] w-full max-w-[290px] flex-col overflow-hidden rounded-xl bg-white shadow-md shadow-gray-200/70 transition-shadow hover:shadow-lg"
        >
          <!-- Product picture -->
          <div class="h-[155px] w-full shrink-0 overflow-hidden bg-gray-100">
            <img
              v-if="product.picture"
              :src="product.picture"
              :alt="product.name || product.articleNumber"
              class="h-full w-full object-cover"
            >

            <div
              v-else
              class="flex h-full items-center justify-center"
            >
              <UIcon
                name="i-lucide-image"
                class="h-9 w-9 text-gray-300"
              />
            </div>
          </div>

          <!-- Product information -->
          <div class="flex min-h-0 flex-1 flex-col gap-2 p-3">
            <!-- Article number, name and actions -->
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <h3
                  class="truncate text-lg font-bold leading-tight text-gray-900"
                  :title="product.articleNumber"
                >
                  {{ product.articleNumber }}
                </h3>

                <p
                  class="mt-1 truncate text-xs text-gray-600"
                  :title="product.name || ''"
                >
                  {{ product.name || 'Unnamed product' }}
                </p>
              </div>

              <!-- Existing Edit/Delete icons -->
              <div class="flex shrink-0 items-center gap-0.5">
                <UTooltip text="Edit product">
                  <UButton
                    icon="i-lucide-square-pen"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    square
                    aria-label="Edit product"
                    @click="editProduct(product)"
                  />
                </UTooltip>

                <UTooltip text="Delete product">
                  <UButton
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    size="xs"
                    square
                    aria-label="Delete product"
                    :loading="deletingId === product.id"
                    @click="deleteProduct(product)"
                  />
                </UTooltip>
              </div>
            </div>

            <!-- Compact product details -->
            <div class="flex flex-wrap content-start gap-1.5 overflow-hidden">
              <!-- <span
                class="max-w-full truncate rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700"
                :title="product.brand"
              >
                {{ product.brand }}
              </span>

              <span
                class="max-w-full truncate rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700"
                :title="product.categoryName || 'Unassigned'"
              >
                {{ product.categoryName || 'Unassigned' }}
              </span> -->

              <span
                class="max-w-full truncate rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700"
                :title="product.colour"
              >
                {{ product.colour }}
              </span>

              <span
                class="max-w-full truncate rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700"
                :title="product.size"
              >
                {{ product.size }}
              </span>
            </div>

            <!-- Warehouse -->
            <div class="flex items-start justify-between gap-2 text-xs">
              <div class="flex shrink-0 items-center gap-1.5 text-gray-500">
                <UIcon
                  name="i-lucide-warehouse"
                  class="h-4 w-4"
                />
                <span>Warehouse</span>
              </div>

              <span
                class="min-w-0 truncate text-right font-medium text-gray-800"
                :title="product.warehouseName || 'No stock location'"
              >
                {{ product.warehouseName || 'No stock location' }}
              </span>
            </div>

            <!-- Available stock -->
            <div class="mt-auto flex items-center justify-between border-t border-gray-100 pt-2">
              <div class="flex items-center gap-1.5">
                <UIcon
                  name="i-lucide-package"
                  class="h-4 w-4 text-gray-500"
                />

                <span class="text-xs text-gray-500">
                  Available stock
                </span>
              </div>

              <div class="flex items-baseline gap-1">
                <span
                  class="text-sm font-bold"
                  :class="product.quantity > 0 ? 'text-green-700' : 'text-red-600'"
                >
                  {{ product.quantity }}
                </span>

                <span class="text-[11px] text-gray-500">
                  pairs
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Existing AutoAdmin table -->
    <div v-show="!isProductsPage || viewMode === 'table'">
      <slot />
    </div>

    <!-- Existing Add Stock modal -->
    <UModal
      v-model:open="showAddStock"
      :ui="{ content: 'sm:max-w-5xl' }"
    >
      <template #content>
        <AddStockModal
          @close="showAddStock = false"
          @saved="stockSaved"
        />
      </template>
    </UModal>

    <!-- Edit Product modal -->
    <UModal
      v-model:open="showEditProduct"
      :ui="{ content: 'sm:max-w-3xl' }"
    >
      <template #content>
        <EditProductModal
          v-if="editingProductId !== null"
          :product-id="editingProductId"
          @close="showEditProduct = false"
          @saved="productUpdated"
        />
      </template>
    </UModal>
  </OriginalAutoAdmin>
</template>
