<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useEditorStore } from '@/stores/editorStore'

const canvasRef = ref(null)
const store = useEditorStore()

onMounted(() => {
  if (canvasRef.value) {
    store.init(canvasRef.value)
  }
})

onBeforeUnmount(() => {
  store.dispose()
})
</script>

<template>
  <div ref="canvasRef" class="viewport"></div>
</template>

<style scoped>
.viewport { width:100%; height:100%; overflow:hidden; }
</style>
