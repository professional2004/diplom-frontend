<script setup>
import { useEditorStore } from '@/stores/editorStore'
import { computed } from 'vue'

const store = useEditorStore()

// Вычисляемое свойство для проверки наличия выбранной поверхности
const hasSelection = computed(() => {
  return store.selectedSurface !== null
})
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
      <button @click="store.addSurface('planar')">Add Planar</button>
      <button @click="store.addSurface('conical')">Add Conical</button>
      <button @click="store.addSurface('cylindrical')">Add Cylindrical</button>
    </div>

    <div class="divider"></div>

    <div class="group">
      <button :disabled="!hasSelection" @click="store.deleteSurface" title="Delete (Del)">Delete</button>
    </div>

    <div class="divider"></div>

    <div class="group">
      <button :disabled="!store.canUndo" @click="store.undo" title="Undo (Ctrl+Z)">Undo</button>
      <button :disabled="!store.canRedo" @click="store.redo" title="Redo (Ctrl+Shift+Z)">Redo</button>
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