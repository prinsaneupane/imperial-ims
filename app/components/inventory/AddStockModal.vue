<script setup lang="ts">
import AutoFormModal from '#layers/autoadmin/components/AutoFormModal.vue'

type Option = {
  id: number
  name: string
}

const emit = defineEmits<{
  close: []
  saved: []
}>()

const overlay = useOverlay()

// Existing Categories from PostgreSQL
const {
  data: categories,
  refresh: refreshCategories,
} = await useFetch<Option[]>('/api/categories')

// Existing Warehouses from PostgreSQL
const {
  data: warehouses,
  refresh: refreshWarehouses,
} = await useFetch('/api/warehouse', {
  default: () => [] as { id: number, name: string }[],
})

const warehouseOptions = computed(() =>
  (warehouses.value ?? []).map(warehouse => ({
    label: warehouse.name,
    value: String(warehouse.id),
  })),
)

const form = reactive({
  articleNumber: '',
  name: '',
  brand: '',
  categoryId: '',
  colour: '',
  size: '',

  importer: '',
  warehouseId: '',
  quantity: '',
})

const pictureFile = ref<File | null>(null)
const picturePreview = ref<string | null>(null)

const saving = ref(false)
const errorMessage = ref('')

const categoryOptions = computed(() =>
  (categories.value ?? []).map(item => ({
    label: item.name,
    value: String(item.id),
  })),
)

// AUTOADMIN RELATION MODALS

async function openRelationModal(
  modelKey: 'categories' | 'warehouses',
  mode: 'create' | 'update',
) {
  const selectedId = modelKey === 'categories'
    ? form.categoryId
    : form.warehouseId

  if (mode === 'update' && !selectedId) {
    return
  }

  const modal = overlay.create(AutoFormModal, {
    props: {
      modelKey,
      mode,

      ...(mode === 'update'
        ? { lookupValue: Number(selectedId) }
        : {}),

      onSave: async (record: Record<string, unknown>) => {
        await refreshCategories()

        if (mode === 'create') {
          const createdCategory = categories.value?.find(
            category =>
              category.id === Number(record.id)
              || category.name === String(record.name),
          )

          if (createdCategory) {
            form.categoryId = String(createdCategory.id)
          }
        }

        modal.close()
      },
    },
  })

  modal.open()
}

// IMAGE SELECTION

function selectPicture(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  errorMessage.value = ''

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ]

  if (!allowedTypes.includes(file.type)) {
    errorMessage.value = 'Only JPG, PNG and WebP images are allowed.'
    input.value = ''
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    errorMessage.value = 'Image must be smaller than 5MB.'
    input.value = ''
    return
  }

  if (picturePreview.value) {
    URL.revokeObjectURL(picturePreview.value)
  }

  pictureFile.value = file
  picturePreview.value = URL.createObjectURL(file)
}

function removePicture() {
  if (picturePreview.value) {
    URL.revokeObjectURL(picturePreview.value)
  }

  pictureFile.value = null
  picturePreview.value = null
}

onBeforeUnmount(removePicture)

// SAVE PRODUCT + STOCK TOGETHER

async function saveStock() {
  if (saving.value) return

  saving.value = true
  errorMessage.value = ''

  try {
    if (!form.categoryId || !form.warehouseId) {
      throw new Error('Please select a category and warehouse.')
    }

    const quantity = Number(form.quantity)

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Quantity must be a positive whole number.')
    }

    let picture: string | null = null

    // Upload the image to our local development endpoint
    if (pictureFile.value) {
      const upload = new FormData()
      upload.append('picture', pictureFile.value)

      const response = await $fetch<{ url: string }>(
        '/api/stock/image',
        {
          method: 'POST',
          body: upload,
        },
      )

      picture = response.url
    }

    await $fetch('/api/stock/add', {
      method: 'POST',
      body: {
        articleNumber: form.articleNumber.trim(),
        name: form.name.trim(),
        brand: form.brand.trim(),
        categoryId: Number(form.categoryId),
        colour: form.colour.trim(),
        size: form.size.trim(),
        importer: form.importer.trim(),
        picture,
        warehouseId: Number(form.warehouseId),
        quantity,
      },
    })

    emit('saved')
  }
  catch (error: unknown) {
    if (error && typeof error === 'object' && 'data' in error) {
      const fetchError = error as {
        data?: {
          statusMessage?: string
        }
      }

      errorMessage.value
        = fetchError.data?.statusMessage || 'Unable to save stock.'
    }
    else if (error instanceof Error) {
      errorMessage.value = error.message
    }
    else {
      errorMessage.value = 'Unable to save stock.'
    }
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="stock-modal">
    <header class="modal-header">
      <div>
        <span class="eyebrow">INVENTORY UPDATE</span>
        <h2>Add new stock</h2>
        <p>Record a newly arrived shoe batch.</p>
      </div>

      <button
        type="button"
        class="close-btn"
        :disabled="saving"
        @click="emit('close')"
      >
        <UIcon name="i-lucide-x" />
      </button>
    </header>

    <form
      class="stock-form"
      @submit.prevent="saveStock"
    >
      <!-- PRODUCT DETAILS -->
      <div class="form-grid">
        <label>
          Article number *
          <input
            v-model.trim="form.articleNumber"
            placeholder="e.g. NK-2048"
            maxlength="100"
            required
          >
        </label>

        <label>
          Product Name *
          <input
            v-model.trim="form.name"
            placeholder="Product name"
            maxlength="200"
            required
          >
        </label>

        <label>
          Brand *
          <input
            v-model.trim="form.brand"
            placeholder="Brand name"
            maxlength="150"
            required
          >
        </label>

        <!-- CATEGORY: AUTOADMIN STYLE -->
        <div class="field">
          <label for="stock-category">Category *</label>

          <div class="relation-row">
            <USelectMenu
              id="stock-category"
              v-model="form.categoryId"
              :items="categoryOptions"
              label-key="label"
              value-key="value"
              placeholder="Select category"
              class="w-full min-w-0 flex-1"
              searchable
            />

            <UButton
              class="shrink-0"
              type="button"
              icon="i-lucide-square-plus"
              color="neutral"
              variant="soft"
              aria-label="Create category"
              @click="openRelationModal('categories', 'create')"
            />

            <UButton
              class="shrink-0"
              type="button"
              icon="i-lucide-edit"
              color="neutral"
              variant="soft"
              aria-label="Edit category"
              :disabled="!form.categoryId"
              @click="openRelationModal('categories', 'update')"
            />
          </div>
        </div>

        <label>
          Colour *
          <input
            v-model.trim="form.colour"
            placeholder="e.g. Black / White"
            maxlength="100"
            required
          >
        </label>

        <label>
          Size *
          <input
            v-model.trim="form.size"
            placeholder="e.g. 40 or UK 8"
            maxlength="50"
            required
          >
        </label>

        <label class="full-width">
          Importer *
          <input
            v-model.trim="form.importer"
            placeholder="Importer or company name"
            maxlength="200"
            required
          >
        </label>

        <!-- DEVICE PICTURE UPLOAD -->
        <div class="field full-width">
          <label for="product-picture">Product Picture</label>

          <input
            id="product-picture"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            @change="selectPicture"
          >

          <div
            v-if="picturePreview"
            class="preview-container"
          >
            <img
              :src="picturePreview"
              alt="Product image preview"
              class="picture-preview"
            >

            <button
              type="button"
              class="remove-image"
              @click="removePicture"
            >
              Remove picture
            </button>
          </div>
        </div>
      </div>

      <!-- STORAGE DETAILS: SAME FORM -->
      <div class="section-divider" />

      <h3>STORAGE DETAILS</h3>

      <div class="form-grid">
        <!-- WAREHOUSE: SAME AS CATEGORY -->
        <div class="field">
          <label for="stock-warehouse">
            Initial Warehouse *
          </label>

          <div class="relation-row">
            <USelectMenu
              v-model="form.warehouseId"
              :items="warehouseOptions"
              label-key="label"
              value-key="value"
              :search-input="{ placeholder: 'Search warehouses...' }"
              placeholder="Select warehouse"
              class="relation-select"
            >
              <template #default>
                <span class="truncate">
                  {{
                    warehouseOptions.find(
                      warehouse => warehouse.value === String(form.warehouseId),
                    )?.label || 'Select warehouse'
                  }}
                </span>
              </template>
            </USelectMenu>

            <UButton
              class="shrink-0"
              type="button"
              icon="i-lucide-square-plus"
              color="neutral"
              variant="soft"
              aria-label="Create warehouse"
              @click="openRelationModal('warehouses', 'create')"
            />

            <UButton
              class="shrink-0"
              type="button"
              icon="i-lucide-edit"
              color="neutral"
              variant="soft"
              aria-label="Edit warehouse"
              :disabled="!form.warehouseId"
              @click="openRelationModal('warehouses', 'update')"
            />
          </div>
        </div>

        <label>
          Quantity (pairs) *
          <input
            v-model="form.quantity"
            type="number"
            min="1"
            step="1"
            placeholder="Enter quantity"
            required
          >
        </label>
      </div>

      <p
        v-if="errorMessage"
        class="error-message"
        role="alert"
      >
        {{ errorMessage }}
      </p>

      <footer class="form-footer">
        <button
          type="button"
          class="cancel-btn"
          :disabled="saving"
          @click="emit('close')"
        >
          Cancel
        </button>

        <button
          type="submit"
          class="save-btn"
          :disabled="saving"
        >
          {{ saving ? 'Saving...' : 'Save stock' }}
        </button>
      </footer>
    </form>
  </section>
</template>

<style scoped>
/* ========================================
   ADD NEW STOCK MODAL
======================================== */

.stock-modal {
  --field-height: 52px;
  --field-border: #d8e2da;
  --field-radius: 9px;
  --primary: #15543e;

  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  background: #fff;
  color: #263c32;
  border-radius: 16px;
  box-sizing: border-box;
}

.stock-modal *,
.stock-modal *::before,
.stock-modal *::after {
  box-sizing: border-box;
}

/* ========================================
   HEADER
======================================== */

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 24px 28px;
  border-bottom: 1px solid #e0e7e2;
}

.eyebrow {
  color: #43816a;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
}

h2 {
  margin: 8px 0;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.3;
}

.modal-header p {
  margin: 0;
  color: #7d8b82;
  font-size: 13px;
}

.close-btn {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  padding: 0;
  border: 1px solid #dbe4dd;
  border-radius: var(--field-radius);
  background: #fff;
  color: #50655a;
  font-size: 20px;
  cursor: pointer;
}

/* ========================================
   FORM LAYOUT
======================================== */

.stock-form {
  padding: 28px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px 18px;
  align-items: start;
  width: 100%;
}

.stock-form label,
.stock-form .field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  margin: 0;
  color: #50655a;
  font-size: 12px;
  font-weight: 600;
}

.full-width {
  grid-column: 1 / -1;
}

/* ========================================
   STANDARD INPUTS
======================================== */

.stock-form input:not([type='file']),
.stock-form select {
  display: block;
  width: 100%;
  min-width: 0;
  height: var(--field-height);
  min-height: var(--field-height);
  margin: 0;
  padding: 0 14px;
  border: 1px solid var(--field-border);
  border-radius: var(--field-radius);
  background: #fff;
  color: #263c32;
  font-family: inherit;
  font-size: 14px;
  font-weight: 400;
  line-height: normal;
  outline: none;
}

.stock-form input::placeholder {
  color: #98a59d;
  opacity: 1;
}

.stock-form input:focus,
.stock-form select:focus {
  border-color: #76a88f;
  outline: none;
  box-shadow: 0 0 0 3px rgb(118 168 143 / 15%);
}

/* ========================================
   CATEGORY & WAREHOUSE DROPDOWNS
======================================== */

.relation-row {
  display: flex;
  align-items: stretch;
  gap: 6px;
  width: 100%;
  min-width: 0;
  height: var(--field-height);
}

/* Nuxt UI USelectMenu */
.relation-select {
  flex: 1 1 0%;
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  height: var(--field-height);
  min-height: var(--field-height);
  border: 1px solid var(--field-border);
  border-radius: var(--field-radius);
  background: #fff;
}

/* SelectMenu internal trigger */
.relation-select :deep(button),
.relation-select :deep([role='combobox']) {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  height: 100%;
  min-height: 0;
  padding: 0 14px;
  border: none;
  border-radius: var(--field-radius);
  background: transparent;
  color: #263c32;
  font-family: inherit;
  font-size: 14px;
  font-weight: 400;
  text-align: left;
  box-shadow: none;
}

.relation-select:focus-within {
  border-color: #76a88f;
  box-shadow: 0 0 0 3px rgb(118 168 143 / 15%);
}

/* Create and Edit relation buttons */
.relation-row > button {
  display: inline-flex;
  flex: 0 0 42px;
  align-items: center;
  justify-content: center;
  width: 42px;
  min-width: 42px;
  height: var(--field-height);
  min-height: var(--field-height);
  margin: 0;
  padding: 0;
  border-radius: var(--field-radius);
}

/* ========================================
   PRICE INPUTS
======================================== */

.money-field {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  height: var(--field-height);
  border: 1px solid var(--field-border);
  border-radius: var(--field-radius);
  background: #fff;
  overflow: hidden;
}

.money-field span {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 14px;
  border-right: 1px solid var(--field-border);
  color: #50655a;
  font-size: 14px;
  font-weight: 500;
}

.stock-form .money-field input {
  flex: 1;
  width: 100%;
  min-width: 0;
  height: 100%;
  min-height: 0;
  padding: 0 14px;
  border: none;
  border-radius: 0;
  outline: none;
  box-shadow: none;
}

.money-field:focus-within {
  border-color: #76a88f;
  box-shadow: 0 0 0 3px rgb(118 168 143 / 15%);
}

/* ========================================
   PICTURE UPLOAD
======================================== */

.stock-form input[type='file'] {
  width: 100%;
  min-height: var(--field-height);
  padding: 12px;
  border: 1px solid var(--field-border);
  border-radius: var(--field-radius);
  background: #fff;
  color: #50655a;
  font-size: 13px;
  cursor: pointer;
}

.stock-form input[type='file']::file-selector-button {
  margin-right: 14px;
  padding: 8px 12px;
  border: 1px solid #d8e2da;
  border-radius: 6px;
  background: #f3f7f4;
  color: #15543e;
  font-weight: 600;
  cursor: pointer;
}

.preview-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  margin-top: 8px;
}

.picture-preview {
  width: 110px;
  height: 110px;
  border: 1px solid var(--field-border);
  border-radius: var(--field-radius);
  object-fit: cover;
}

.remove-image {
  padding: 0;
  border: none;
  background: transparent;
  color: #b42318;
  font-size: 12px;
  cursor: pointer;
}

/* ========================================
   STORAGE DETAILS SECTION
======================================== */

.section-divider {
  width: 100%;
  height: 1px;
  margin: 28px 0;
  background: #dce5df;
}

h3 {
  margin: 0 0 20px;
  color: #345e4c;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.8px;
}

/* ========================================
   ERROR MESSAGE
======================================== */

.error-message {
  margin-top: 18px;
  color: #b42318;
  font-size: 13px;
}

/* ========================================
   FORM ACTIONS
======================================== */

.form-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  margin-top: 28px;
}

.cancel-btn,
.save-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 12px 20px;
  border-radius: var(--field-radius);
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.cancel-btn {
  border: 1px solid var(--field-border);
  background: #fff;
  color: #314d40;
}

.cancel-btn:hover {
  background: #f3f7f4;
}

.save-btn {
  border: 1px solid var(--primary);
  background: var(--primary);
  color: #fff;
}

.save-btn:hover {
  background: #103f30;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ========================================
   RESPONSIVE DESIGN
======================================== */

@media (max-width: 640px) {
  .modal-header,
  .stock-form {
    padding: 18px;
  }

  h2 {
    font-size: 21px;
  }

  .form-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }

  .full-width {
    grid-column: 1;
  }

  .relation-row {
    flex-wrap: nowrap;
  }

  .relation-row > button {
    flex-basis: 40px;
    width: 40px;
    min-width: 40px;
  }

  .form-footer {
    flex-wrap: wrap;
  }
}
</style>
