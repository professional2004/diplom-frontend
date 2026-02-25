<script setup>
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { ShapeRegistry } from '@/core/3D_editor/entities/ShapeRegistry'

const store = useEditorStore()

// Получаем схему параметров на основе типа выбранной фигуры
const schema = computed(() => {
  if (!store.selectedShape) return null
  const type = store.selectedShape.userData.shapeType
  const instance = ShapeRegistry.create(type, {})
  return instance.parameterDefinitions
})

const onParamChange = (key, event) => {
  const val = parseFloat(event.target.value)
  if (isNaN(val)) return
  
  // Собираем новый объект параметров и отправляем в стор
  const newParams = { ...store.selectedShapeParams, [key]: val }
  store.updateShapeParams(newParams)
}
</script>

<template>
  <div class="shape-board" v-if="schema && store.selectedShapeParams">
    <div class="header">Свойства фигуры</div>
    <div class="params-list">
      <div class="param-item" v-for="(def, key) in schema" :key="key">
        <label :title="def.label">{{ def.label }}</label>
        <input
          type="number"
          :min="def.min"
          :step="def.step"
          :value="store.selectedShapeParams[key]"
          @change="onParamChange(key, $event)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.shape-board {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 200px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: auto; /* Важно, чтобы панель была кликабельной поверх ui-layer */
}

.header {
  font-weight: bold;
  font-size: 14px;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.params-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.param-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.param-item label {
  font-size: 12px;
  color: #555;
  cursor: help;
}

.param-item input {
  width: 70px;
  padding: 4px;
  font-size: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  outline: none;
}

.param-item input:focus {
  border-color: #888;
}
</style>