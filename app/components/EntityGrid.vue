<script setup lang="ts">
import OriginalEntityGrid from '#layers/autoadmin/components/EntityGrid.vue'
import AddStockModal from '~/components/inventory/AddStockModal.vue'

const route = useRoute()
const showAddStock = ref(false)

const showAddStockButton = computed(() => {
  const path = route.path.replace(/\/+$/, '')

  return (
    path === '/admin'
    || path === '/admin/products'
  )
})

function stockSaved() {
  showAddStock.value = false

  // Reload product data after successful stock creation.
  refreshNuxtData()
}
</script>

<template>
  <div>
    <div
      v-if="showAddStockButton"
      class="flex justify-end mb-4"
    >
      <UButton
        icon="i-lucide-plus"
        color="primary"
        size="lg"
        @click="showAddStock = true"
      >
        Add New Stock
      </UButton>
    </div>

    <OriginalEntityGrid />

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
  </div>
</template>
