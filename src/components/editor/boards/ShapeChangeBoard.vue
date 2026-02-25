<script setup>
import { ref, watch, computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { ShapeRegistry } from '@/core/3D_editor/entities/ShapeRegistry'

const store = useEditorStore()

// Локальная копия параметров для редактирования без мгновенного влияния на сцену
const localParams = ref({})

// Схема свойств выбранной фигуры
const schema = computed(() => {
  if (!store.selectedShape) return null
  const type = store.selectedShape.userData.shapeType
  const instance = ShapeRegistry.create(type, {})
  return instance.parameterDefinitions
})

// При смене выбранной фигуры обновляем локальную копию параметров
watch(
  () => store.selectedShapeParams,
  (newVal) => {
    if (newVal) {
      // Глубокое копирование для безопасного редактирования массивов и объектов
      localParams.value = JSON.parse(JSON.stringify(newVal))
    } else {
      localParams.value = {}
    }
  },
  { immediate: true, deep: true }
)

const applyChanges = () => {
  if (!store.selectedShape) return
  // Отправляем измененные параметры через стор и Command-паттерн
  store.updateShapeParams(JSON.parse(JSON.stringify(localParams.value)))
}

// Утилиты для определения типа данных в object
const isSinglePoint = (arr) => Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'number'
const isPointArray = (arr) => Array.isArray(arr) && (arr.length === 0 || Array.isArray(arr[0]))

const addPoint = (key) => {
  const arr = localParams.value[key]
  if (arr.length > 0) {
    // Копируем последнюю точку массива
    arr.push([...arr[arr.length - 1]])
  } else {
    // Если массив пуст, смотрим на название (polygon обычно 2D, остальные 3D)
    const is2D = key.toLowerCase().includes('polygon')
    arr.push(is2D ? [0, 0] : [0, 0, 0])
  }
}

const removePoint = (key, index) => {
  localParams.value[key].splice(index, 1)
}
</script>

<template>
  <div class="shape-board" v-if="schema && store.selectedShapeParams">
    <div class="header">Свойства фигуры</div>
    
    <div class="params-list">
      <div v-for="(def, key) in schema" :key="key" class="param-group">
        <label :title="def.label" class="param-title">{{ def.label }}</label>

        <div v-if="def.type === 'number'" class="param-content">
          <input
            type="number"
            :min="def.min"
            :step="def.step || 0.1"
            v-model.number="localParams[key]"
            class="input-number"
          />
        </div>

        <div v-else-if="def.type === 'object' && localParams[key]" class="param-content">
          
          <div v-if="isSinglePoint(localParams[key])" class="point-row">
            <input 
              v-for="(_, idx) in localParams[key]" 
              :key="'sp'+idx" 
              type="number" 
              step="0.1" 
              v-model.number="localParams[key][idx]" 
              class="input-coord"
            />
          </div>

          <div v-else-if="isPointArray(localParams[key])" class="point-array">
            <div v-for="(point, ptIdx) in localParams[key]" :key="ptIdx" class="point-row">
              <span class="pt-idx">{{ ptIdx + 1 }}.</span>
              <input 
                v-for="(_, coordIdx) in point" 
                :key="'c'+coordIdx" 
                type="number" 
                step="0.1" 
                v-model.number="point[coordIdx]" 
                class="input-coord"
              />
              <button @click="removePoint(key, ptIdx)" class="btn-remove-pt" title="Удалить точку">×</button>
            </div>
            <button @click="addPoint(key)" class="btn-add-pt">+ Добавить точку</button>
          </div>
          
        </div>
      </div>
    </div>

    <div class="actions">
      <button class="btn-apply" @click="applyChanges">Применить изменения</button>
    </div>
  </div>
</template>

<style scoped>
.shape-board {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 260px;
  max-height: 80vh; /* Чтобы меню не уходило за экран при больших массивах */
  overflow-y: auto;
  padding: 15px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  gap: 15px;
  pointer-events: auto;
}

/* Скроллбар для панели */
.shape-board::-webkit-scrollbar { width: 6px; }
.shape-board::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }

.header {
  font-weight: bold;
  font-size: 15px;
  color: #333;
  border-bottom: 1px solid #ddd;
  padding-bottom: 8px;
}

.params-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.param-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.param-title {
  font-size: 12px;
  color: #555;
  font-weight: 600;
}

.input-number {
  width: 100%;
  padding: 6px;
  font-size: 13px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

/* Стили для редактирования точек */
.point-array {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #f9f9f9;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #eee;
}

.point-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pt-idx {
  font-size: 11px;
  color: #888;
  width: 18px;
}

.input-coord {
  flex: 1;
  width: 0; /* чтобы flex работал равномерно */
  padding: 4px;
  font-size: 12px;
  border: 1px solid #ccc;
  border-radius: 3px;
}

.btn-remove-pt {
  background: #ff4d4f;
  color: white;
  border: none;
  border-radius: 3px;
  width: 20px;
  height: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
}
.btn-remove-pt:hover { background: #ff7875; }

.btn-add-pt {
  margin-top: 4px;
  background: transparent;
  border: 1px dashed #aaa;
  color: #666;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
}
.btn-add-pt:hover { background: #eee; }

/* Кнопка Применить */
.actions {
  margin-top: 5px;
  border-top: 1px solid #ddd;
  padding-top: 15px;
}

.btn-apply {
  width: 100%;
  background: #1890ff;
  color: white;
  border: none;
  padding: 8px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-apply:hover {
  background: #40a9ff;
}
</style>