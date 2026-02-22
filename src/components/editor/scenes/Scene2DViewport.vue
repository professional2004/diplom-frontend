<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { Engine2D } from '@/core/2D_editor/engine/Engine'

const containerRef = ref(null)
const store = useEditorStore()
let engine2D = null

// Передаем 3D-движок в 2D-движок, как только он проинициализируется в сторе
watch(
  () => store.engine,
  (newEngine) => {
    if (newEngine && engine2D) {
      engine2D.set3DEngine(newEngine)
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (!containerRef.value) return
  engine2D = new Engine2D(containerRef.value)
  if (store.engine) {
    engine2D.set3DEngine(store.engine)
  }
})

onBeforeUnmount(() => {
  engine2D?.dispose()
})
</script>

<template>
  <div ref="containerRef" class="unfold-viewport">
    <div class="overlay-info">Проекция развертки (2D)</div>
  </div>
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