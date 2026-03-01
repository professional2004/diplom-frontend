<script setup>
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'

const store = useEditorStore()

// Вычисляемое свойство для проверки наличия выбранной фигуры
const hasSelection = computed(() => {
  return store.selectedShape !== null
})
</script>

<template>
  <div class="toolbar">
    <div class="group">
      <button :disabled="!hasSelection" @click="store.deleteShape" title="Delete (Del)">Delete</button>
    </div>

    <div class="divider"></div>

    <div class="group">
      <button :disabled="!store.canUndo" @click="store.undo" title="Undo (Ctrl+Z)">Undo</button>
      <button :disabled="!store.canRedo" @click="store.redo" title="Redo (Ctrl+Shift+Z)">Redo</button>
    </div>

    <div class="divider"></div>

    <div class="group">
      <button 
        @click="store.toggleConnectMode" 
        :class="{ 'active-mode': store.isConnectingMode }"
        title="Связать края фигур"
      >
        {{ store.isConnectingMode ? 'Cancel Connection' : 'Connect Edges' }}
      </button>
    </div>

    <div class="divider"></div>

    <div class="group">
      <button @click="store.addShape('conical')">Add Conical Surface</button>
      <button @click="store.addShape('cylindrical')">Add Cylindrical Surface</button>
      <button @click="store.addShape('flat')">Add Flat Surface</button>
    </div>
  </div>
</template>

<style scoped>
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
/* Стиль для активной кнопки режима */
button.active-mode {
  background: #e3f2fd;
  border-color: #2196f3;
  color: #0d47a1;
  font-weight: bold;
  box-shadow: inset 0 0 5px rgba(33, 150, 243, 0.2);
}
</style>