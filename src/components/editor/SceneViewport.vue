<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useEditorStore } from '@/stores/editorStore'

const canvasRef = ref(null)
const editorStore = useEditorStore()

onMounted(() => {
  if (canvasRef.value) {
    editorStore.initScene(canvasRef.value)
  }
})

onBeforeUnmount(() => {
  editorStore.disposeScene()
})
</script>

<template>
  <div ref="canvasRef" class="viewport"></div>
</template>

<style scoped>
.viewport { width: 100%; height: 100%; overflow: hidden; }
</style>