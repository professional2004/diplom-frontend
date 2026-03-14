<script setup>
import { useEditorStore } from '@/stores/editorStore'

const editorStore = useEditorStore()

</script>

<template>
  <div class="toolbar">
    <div class="group">
      <button @click="editorStore.zoomIn3D()">Zoom +</button>
      <button @click="editorStore.zoomOut3D()">Zoom -</button>
      <button @click="editorStore.resetView3D()">Reset</button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
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
.toolbar button {
  padding: 6px 8px;
  border: 1px solid #ccc;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}
.toolbar button:hover { background: #f7f7f7; }
</style>