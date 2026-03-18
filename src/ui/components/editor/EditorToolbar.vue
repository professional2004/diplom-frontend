<script setup>
import { useEditorStore } from '@/stores/editorStore'

const store = useEditorStore()
</script>

<template>
  <div class="toolbar">
    <div class="group">
      <button @click="store.zoomIn">Zoom In (+)</button>
      <button @click="store.zoomOut">Zoom Out (-)</button>
      <button @click="store.resetView">Reset</button>
    </div>
    
    <div class="divider"></div>

    <div class="group">
      <button @click="store.addCube">Add Cube</button>
    </div>

    <div class="divider"></div>

    <div class="group">
      <button :disabled="!store.canUndo" @click="store.undo">Undo (Ctrl+Z)</button>
      <button :disabled="!store.canRedo" @click="store.redo">Redo (Ctrl+Y)</button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  padding: 10px;
  display: flex;
  gap: 10px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(4px);
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
button:disabled { opacity: 0.5; cursor: not-allowed; }
button:hover:not(:disabled) { background: #f0f0f0; }
</style>