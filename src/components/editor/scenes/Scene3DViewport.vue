<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import EngineRegistry from '@/editor_core/general/engine/EngineRegistry'

const canvasRef = ref(null)
const store = useEditorStore()

onMounted(() => {
  if (canvasRef.value) {
    store.init3D(canvasRef.value)
    // after engine initialized, register renderer canvas for preview
    try {
      const canvas = EngineRegistry.engine3D?.renderSystem3D?.domElement || null
      if (canvas) store.setCurrentCanvas(canvas)
    } catch (e) {
      console.warn('[Scene3DViewport] failed to set current canvas for preview', e)
    }
  }
})

onUnmounted(() => {
  // clear current canvas when viewport is destroyed
  try { store.setCurrentCanvas(null) } catch (e) {}
})
</script>

<template>
  <div ref="canvasRef" class="viewport"></div>
</template>

<style scoped>
.viewport { width:100%; height:100%; overflow:hidden; }
</style>
