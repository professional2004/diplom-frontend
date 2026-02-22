<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { Engine2D } from '@/core/2D_editor/engine/Engine2D'

const containerRef = ref(null)
const store = useEditorStore()
let engine2D = null

watch(
  () => store.engine3D,
  (engine3D) => {
    if (engine3D && engine2D) {
      engine2D.set3DEngine(engine3D)
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (!containerRef.value) return

  engine2D = new Engine2D(containerRef.value)

  // регистрируем в store
  store.setEngine2D(engine2D)

  if (store.engine3D) {
    engine2D.set3DEngine(store.engine3D)
  }
})

onBeforeUnmount(() => {
  engine2D?.dispose()
  store.setEngine2D(null)
})
</script>

<template>
  <div ref="containerRef" class="unfold-viewport">
    <div class="overlay-info">Проекция развертки (2D)</div>

    <!-- 2D toolbar overlay -->
    <div class="toolbar-2d" aria-hidden="false">
      <button @click="store.zoomIn2D()">Zoom +</button>
      <button @click="store.zoomOut2D()">Zoom -</button>
      <button @click="store.reset2D()">Reset</button>
    </div>
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

/* 2D toolbar */
.toolbar-2d {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  gap: 6px;
  z-index: 12;
  pointer-events: auto;
  background: rgba(255,255,255,0.9);
  padding: 6px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.toolbar-2d button {
  padding: 6px 8px;
  border: 1px solid #ccc;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}
.toolbar-2d button:hover { background: #f7f7f7; }
</style>