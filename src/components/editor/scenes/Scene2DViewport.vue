<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '@/stores/editorStore'

const containerRef = ref(null)
const store = useEditorStore()

onMounted(() => {
  if (!containerRef.value) return
  store.initEngineRegistry()
  store.init2D(containerRef.value)
})

onUnmounted(() => {
  // detach 2D canvas to prevent orphaned element
  try {
    const ER = store.engineRegistry
    const canvas = ER?.engine2D?.renderSystem2D?.renderer?.domElement
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas)
  } catch (e) { /* ignore */ }
})
</script>

<template>
  <div ref="containerRef" class="unfold-viewport"></div>
</template>

<style scoped>
.unfold-viewport { 
  width: 100%;
  height: 100%; 
  background: #f0f0f0; 
  border-left: 2px solid #ddd;
  position: relative;
  overflow: hidden;
  cursor: default;
}
.overlay-info {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 11px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 1px;
  pointer-events: none;
}

</style>