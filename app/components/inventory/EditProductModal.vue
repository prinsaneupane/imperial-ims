<script setup lang="ts">
type Category = {
  id: number
  name: string
}

type Warehouse = {
  id: number
  name: string
  quantity: number
}

type ProductDetails = {
  id: number
  articleNumber: string
  name: string | null
  brand: string
  categoryId: number
  colour: string
  size: string
  importer: string
  picture: string | null
  isActive: boolean | null
}

type EditResponse = {
  product: ProductDetails
  categories: Category[]
  warehouses: Warehouse[]
}

const props = defineProps<{
  productId: number
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')

const categories = ref<Category[]>([])
const warehouses = ref<Warehouse[]>([])

const form = reactive({
  articleNumber: '',
  name: '',
  brand: '',
  categoryId: 0,
  colour: '',
  size: '',
  importer: '',
  picture: null as string | null,
  isActive: true,
  warehouseId: 0,
  quantity: 0,
})

const selectedWarehouse = computed(() =>
  warehouses.value.find(item => item.id === form.warehouseId),
)

const storedWarehouses = computed(() =>
  warehouses.value.filter(item => item.quantity !== 0),
)

const totalStock = computed(() =>
  warehouses.value.reduce((sum, warehouse) => sum + warehouse.quantity, 0),
)

function selectWarehouse() {
  form.quantity = selectedWarehouse.value?.quantity ?? 0
}

async function loadProduct() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<EditResponse>(
      `/api/products/${props.productId}`,
    )

    const product = response.product

    categories.value = response.categories
    warehouses.value = response.warehouses

    form.articleNumber = product.articleNumber
    form.name = product.name ?? ''
    form.brand = product.brand
    form.categoryId = product.categoryId
    form.colour = product.colour
    form.size = product.size
    form.importer = product.importer
    form.picture = product.picture
    form.isActive = product.isActive ?? true

    // Prefer a warehouse already containing this product.
    const initialWarehouse
      = warehouses.value.find(item => item.quantity > 0)
        ?? warehouses.value[0]

    form.warehouseId = initialWarehouse?.id ?? 0
    selectWarehouse()
  }
  catch (error: unknown) {
    const err = error as {
      data?: { statusMessage?: string }
      message?: string
    }

    errorMessage.value
      = err.data?.statusMessage
        ?? err.message
        ?? 'Unable to load product.'
  }
  finally {
    loading.value = false
  }
}

async function saveProduct() {
  if (saving.value)
    return

  errorMessage.value = ''

  if (
    !form.articleNumber.trim()
    || !form.name.trim()
    || !form.brand.trim()
    || !form.colour.trim()
    || !form.size.trim()
    || !form.importer.trim()
    || !form.categoryId
    || !form.warehouseId
    || !Number.isInteger(form.quantity)
    || form.quantity < 0
  ) {
    errorMessage.value = 'Please complete all required fields.'
    return
  }

  saving.value = true

  try {
    await $fetch(`/api/products/${props.productId}`, {
      method: 'PATCH',
      body: {
        ...form,
      },
    })

    emit('saved')
  }
  catch (error: unknown) {
    const err = error as {
      data?: { statusMessage?: string }
      message?: string
    }

    errorMessage.value
      = err.data?.statusMessage
        ?? err.message
        ?? 'Unable to update product.'
  }
  finally {
    saving.value = false
  }
}

onMounted(loadProduct)
</script>

<template>
  <div class="max-h-[90vh] overflow-y-auto rounded-xl bg-white text-gray-800">
    <!-- Header -->
    <div class="flex items-start justify-between px-8">
      <div class="mt-8">
        <h2 class="text-xl font-semibold my-8">
          Edit Product
        </h2>
      </div>

      <UButton
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        square
        aria-label="Close"
        @click="emit('close')"
      />
    </div>

    <div
      v-if="loading"
      class="p-10 text-center text-sm text-gray-500"
    >
      Loading product...
    </div>

    <form
      v-else
      class="space-y-5 p-6"
      @submit.prevent="saveProduct"
    >
      <div
        v-if="errorMessage"
        class="rounded-lg bg-red-50 p-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label class="field">
          Article Number *
          <input
            v-model="form.articleNumber"
            required
          >
        </label>

        <label class="field">
          Product Name *
          <input
            v-model="form.name"
            required
          >
        </label>

        <label class="field">
          Brand *
          <input
            v-model="form.brand"
            required
          >
        </label>

        <label class="field">
          Category *
          <select
            v-model.number="form.categoryId"
            required
          >
            <option
              :value="0"
              disabled
            >
              Select category
            </option>

            <option
              v-for="category in categories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select>
        </label>

        <label class="field">
          Colour *
          <input
            v-model="form.colour"
            required
          >
        </label>

        <label class="field">
          Size *
          <input
            v-model="form.size"
            required
          >
        </label>

        <label class="field sm:col-span-2">
          Importer *
          <input
            v-model="form.importer"
            required
          >
        </label>

        <label class="field sm:col-span-2">
          Picture URL
          <input
            v-model="form.picture"
            placeholder="/uploads/products/image.jpg"
          >
        </label>
      </div>

      <label class="flex items-center gap-2 text-sm">
        <input
          v-model="form.isActive"
          type="checkbox"
          class="h-4 w-4"
        >
        Active product
      </label>

      <!-- Warehouse / Quantity -->
      <div class="pt-5">
        <h3 class="font-semibold text-gray-800">
          Warehouse & Stock
        </h3>

        <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="field">
            Warehouse *
            <select
              v-model.number="form.warehouseId"
              required
              @change="selectWarehouse"
            >
              <option
                :value="0"
                disabled
              >
                Select warehouse
              </option>

              <option
                v-for="warehouse in warehouses"
                :key="warehouse.id"
                :value="warehouse.id"
              >
                {{ warehouse.name }}
              </option>
            </select>
          </label>

          <label class="field">
            Quantity (pairs) *
            <input
              v-model.number="form.quantity"
              type="number"
              min="0"
              step="1"
              required
            >
          </label>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3  pt-5">
        <UButton
          type="button"
          color="neutral"
          variant="outline"
          :disabled="saving"
          @click="emit('close')"
        >
          Cancel
        </UButton>

        <UButton
          type="submit"
          color="primary"
          icon="i-lucide-check"
          :loading="saving"
        >
          Update Product
        </UButton>
      </div>
    </form>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 7px;
  color: #50655a;
  font-size: 12px;
  font-weight: 600;
}

.field input:not([type='checkbox']),
.field select {
  width: 100%;
  height: 46px;
  min-width: 0;
  border: 1px solid #d8e2da;
  border-radius: 9px;
  background: white;
  padding: 0 12px;
  color: #263c32;
  font-size: 14px;
  font-weight: 400;
}

.field input:focus,
.field select:focus {
  border-color: #76a88f;
  outline: none;
  box-shadow: 0 0 0 3px rgb(118 168 143 / 15%);
}
</style>
