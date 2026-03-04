<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '@/stores/editorStore'

const canvasRef = ref(null)
const store = useEditorStore()

onMounted(() => {
  if (canvasRef.value) {
    store.initEngineRegistry()
    store.init3D(canvasRef.value)
    // // after engine initialized, register renderer canvas for preview
    // try {
    //   const canvas = EngineRegistry.engine3D?.renderSystem3D?.domElement || null
    //   if (canvas) store.setCurrentCanvas(canvas)
    // } catch (e) {
    //   console.warn('[Scene3DViewport] failed to set current canvas for preview', e)
    // }
  }
})

onUnmounted(() => {
  // Detach canvas when component is removed so it doesn't stay in stale DOM
  try {
    const ER = store.engineRegistry
    const canvas = ER?.engine3D?.renderSystem3D?.domElement
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas)
  } catch (e) { /* ignore */ }
})
</script>

<template>
  <div ref="canvasRef" class="viewport"></div>
</template>

<style scoped>
.viewport { width:100%; height:100%; overflow:hidden; }
</style>
