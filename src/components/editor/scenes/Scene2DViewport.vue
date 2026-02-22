<script setup>
import { ref, onMounted } from 'vue'
import { useEditorStore } from '@/stores/editorStore'

const containerRef = ref(null)
const store = useEditorStore()

onMounted(() => {
  if (!containerRef.value) return
  store.init2D(containerRef.value) // Используем новый метод init2D
})
</script>

<template>
  <div ref="containerRef" class="unfold-viewport">
    <div class="overlay-info">Проекция развертки (2D)</div>
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