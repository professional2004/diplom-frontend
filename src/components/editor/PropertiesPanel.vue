<script setup>
import { useEditorStore } from '@/stores/editorStore'
import { computed, watch, ref } from 'vue'

const store = useEditorStore()

// Локальные копии параметров для отредактированного ввода
const localParams = ref({})
const localPosition = ref({ x: 0, y: 0, z: 0 })
const localRotation = ref({ x: 0, y: 0, z: 0 })

// Получаем текущую выбранную фигуру
const selectedShape = computed(() => store.selectedShape)

// Получаем параметры текущей фигуры
const params = computed(() => {
  if (!selectedShape.value || !selectedShape.value.userData) {
    return null
  }
  return selectedShape.value.userData.params || null
})

// Получаем тип текущей фигуры
const shapeType = computed(() => {
  if (!selectedShape.value || !selectedShape.value.userData) {
    return null
  }
  return selectedShape.value.userData.shapeType || null
})

// Определяем поля для каждого типа фигуры
const paramFields = computed(() => {
  const type = shapeType.value
  
  if (type === 'cube') {
    return {
      width: { label: 'Size', min: 0.1, step: 0.1 }
    }
  }
  
  if (type === 'roundedPrism') {
    return {
      width: { label: 'Width', min: 0.1, step: 0.1 },
      depth: { label: 'Depth', min: 0.1, step: 0.1 },
      height: { label: 'Height', min: 0.1, step: 0.1 },
      radius: { label: 'Radius', min: 0, step: 0.05 }
    }
  }
  
  return {}
})

// Следим за изменениями выбранной фигуры
watch(selectedShape, (newShape) => {
  if (newShape && newShape.userData && newShape.userData.params) {
    localParams.value = { ...newShape.userData.params }
  } else {
    localParams.value = {}
  }
  
  if (newShape && newShape.position) {
    localPosition.value = {
      x: parseFloat(newShape.position.x.toFixed(3)),
      y: parseFloat(newShape.position.y.toFixed(3)),
      z: parseFloat(newShape.position.z.toFixed(3))
    }
  }
  
  if (newShape && newShape.rotation) {
    localRotation.value = {
      x: parseFloat((newShape.rotation.x * 180 / Math.PI).toFixed(2)),
      y: parseFloat((newShape.rotation.y * 180 / Math.PI).toFixed(2)),
      z: parseFloat((newShape.rotation.z * 180 / Math.PI).toFixed(2))
    }
  }
}, { immediate: true })

// Обновляем параметр при изменении значения
const updateParam = (paramName, value) => {
  const numValue = parseFloat(value)
  if (isNaN(numValue)) return
  
  // Обновляем локальное значение
  localParams.value[paramName] = numValue
  
  // Вызываем действие store для обновления mesh
  store.updateShapeParams(selectedShape.value, {
    ...params.value,
    [paramName]: numValue
  })
}

// Обновляем позицию
const updatePosition = (axis, value) => {
  const numValue = parseFloat(value)
  if (isNaN(numValue)) return
  
  localPosition.value[axis] = numValue
  store.updateShapePosition(
    selectedShape.value,
    localPosition.value.x,
    localPosition.value.y,
    localPosition.value.z
  )
}

// Обновляем поворот (конвертируем из градусов в радианы)
const updateRotation = (axis, value) => {
  const numValue = parseFloat(value)
  if (isNaN(numValue)) return
  
  localRotation.value[axis] = numValue
  store.updateShapeRotation(
    selectedShape.value,
    localRotation.value.x * Math.PI / 180,
    localRotation.value.y * Math.PI / 180,
    localRotation.value.z * Math.PI / 180
  )
}

// Определяем, показывать ли панель
const showPanel = computed(() => {
  return selectedShape.value !== null && shapeType.value !== null
})

// Получаем название типа фигуры для отображения
const shapeTypeLabel = computed(() => {
  const type = shapeType.value
  if (type === 'cube') return 'Cube'
  if (type === 'roundedPrism') return 'Rounded Prism'
  return 'Unknown'
})
</script>

<template>
  <div v-if="showPanel" class="properties-panel">
    <div class="panel-header">
      <h3>{{ shapeTypeLabel }}</h3>
    </div>
    
    <div class="panel-content">
      <!-- Параметры размера/формы -->
      <div class="section-title">Geometry</div>
      <div
        v-for="(field, paramName) in paramFields"
        :key="paramName"
        class="param-field"
      >
        <label>{{ field.label }}</label>
        <div class="input-wrapper">
          <input
            type="number"
            :value="localParams[paramName] || 0"
            :min="field.min"
            :step="field.step"
            @change="updateParam(paramName, $event.target.value)"
            @input="localParams[paramName] = parseFloat($event.target.value)"
          />
          <span class="unit">m</span>
        </div>
      </div>

      <!-- Позиция -->
      <div class="section-title">Position</div>
      <div class="param-field">
        <label>X</label>
        <div class="input-wrapper">
          <input
            type="number"
            :value="localPosition.x"
            step="0.1"
            @change="updatePosition('x', $event.target.value)"
            @input="localPosition.x = parseFloat($event.target.value)"
          />
          <span class="unit">m</span>
        </div>
      </div>
      <div class="param-field">
        <label>Y</label>
        <div class="input-wrapper">
          <input
            type="number"
            :value="localPosition.y"
            step="0.1"
            @change="updatePosition('y', $event.target.value)"
            @input="localPosition.y = parseFloat($event.target.value)"
          />
          <span class="unit">m</span>
        </div>
      </div>
      <div class="param-field">
        <label>Z</label>
        <div class="input-wrapper">
          <input
            type="number"
            :value="localPosition.z"
            step="0.1"
            @change="updatePosition('z', $event.target.value)"
            @input="localPosition.z = parseFloat($event.target.value)"
          />
          <span class="unit">m</span>
        </div>
      </div>

      <!-- Поворот -->
      <div class="section-title">Rotation</div>
      <div class="param-field">
        <label>Rot X</label>
        <div class="input-wrapper">
          <input
            type="number"
            :value="localRotation.x"
            step="5"
            @change="updateRotation('x', $event.target.value)"
            @input="localRotation.x = parseFloat($event.target.value)"
          />
          <span class="unit">°</span>
        </div>
      </div>
      <div class="param-field">
        <label>Rot Y</label>
        <div class="input-wrapper">
          <input
            type="number"
            :value="localRotation.y"
            step="5"
            @change="updateRotation('y', $event.target.value)"
            @input="localRotation.y = parseFloat($event.target.value)"
          />
          <span class="unit">°</span>
        </div>
      </div>
      <div class="param-field">
        <label>Rot Z</label>
        <div class="input-wrapper">
          <input
            type="number"
            :value="localRotation.z"
            step="5"
            @change="updateRotation('z', $event.target.value)"
            @input="localRotation.z = parseFloat($event.target.value)"
          />
          <span class="unit">°</span>
        </div>
      </div>
    </div>
  </div>
  
  <div v-else class="properties-panel empty">
    <div class="panel-header">
      <h3>Properties</h3>
    </div>
    <div class="panel-content">
      <p class="empty-message">Select a shape to edit properties</p>
    </div>
  </div>
</template>

<style scoped>
.properties-panel {
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.properties-panel.empty {
  opacity: 0.6;
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  background: #f9f9f9;
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.panel-content {
  padding: 12px 16px;
  flex: 1;
  overflow-y: auto;
  max-height: 500px;
}

.empty-message {
  margin: 20px 0;
  text-align: center;
  color: #999;
  font-size: 13px;
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 14px;
  margin-bottom: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.section-title:first-child {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

.param-field {
  margin-bottom: 10px;
}

.param-field:last-child {
  margin-bottom: 0;
}

.param-field label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #555;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.param-field input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  font-family: 'Courier New', monospace;
  transition: border-color 0.2s;
}

.param-field input:focus {
  outline: none;
  border-color: #FF8800;
  box-shadow: 0 0 0 2px rgba(255, 136, 0, 0.1);
}

.param-field input:hover {
  border-color: #bbb;
}

.unit {
  font-size: 11px;
  color: #999;
  font-weight: 500;
  min-width: 22px;
  text-align: center;
}
</style>
