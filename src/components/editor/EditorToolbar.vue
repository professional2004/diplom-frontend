<script setup>
import { useEditorStore } from '@/stores/editorStore'
const store = useEditorStore()
</script>

<template>
  <div class="toolbar">
    <div class="group">
      <button @click="store.zoomIn">Zoom +</button>
      <button @click="store.zoomOut">Zoom -</button>
      <button @click="store.resetView">Reset</button>
    </div>
    
    <div class="divider"></div>
    
    <div class="group">
      <button @click="store.addShape('cube')">Add Cube</button>
      <button @click="store.addShape('roundedPrism')">Add Rounded Prism</button>
    </div>

    <div class="divider"></div>

    <div class="group">
      <button :disabled="!store.canUndo" @click="store.undo">Undo</button>
      <button :disabled="!store.canRedo" @click="store.redo">Redo</button>
    </div>
  </div>
</template>

<style scoped>
/* Стили остаются старые, код стилей опущен для краткости, он есть в исходнике [cite: 92-113] */
.toolbar {
  padding: 10px;
  display: flex;
  gap: 10px;
  background: rgba(255, 255, 255, 0.9);
  border-bottom-right-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}
.group { display: flex; gap: 5px; }
.divider { width: 1px; background: #ccc; margin: 0 5px; }
button {
  cursor: pointer;
  padding: 5px 10px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
}
button:hover { background: #f0f0f0; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>