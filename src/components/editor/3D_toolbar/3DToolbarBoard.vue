<script setup>
import { ref, computed, watch } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import Polyline2DEditor from './Polyline2DEditor.vue'

const editorStore = useEditorStore()
const hasUnsavedChanges = ref(false)

// активная фигура (логический объект) – используется для определения
// описания параметров и названия. Не содержит сами значения.
const shapeInstance = computed(() => {
  const ent = editorStore.selectedShape
  if (!ent) return null
  // owner обычно содержит методы и определения параметров
  return ent.owner || (ent.mesh ? ent.mesh.userData.owner : null)
})

const shapeName = computed(() => {
  if (!shapeInstance.value) return ''
  return shapeInstance.value.userData?.shapeType || shapeInstance.value.constructor.name
})

const parameterDefinitions = computed(() => {
  return shapeInstance.value?.parameterDefinitions || {}
})

// Параметры геометрии (без трансформаций)
const geometryParams = computed(() => {
  const defs = parameterDefinitions.value
  const result = {}
  for (const [key, def] of Object.entries(defs)) {
    if (!key.startsWith('pos') && !key.startsWith('rotation')) {
      result[key] = def
    }
  }
  return result
})

// Параметры позиции
const positionParams = computed(() => {
  const defs = parameterDefinitions.value
  const result = {}
  for (const key of ['posX', 'posY', 'posZ']) {
    if (defs[key]) {
      result[key] = defs[key]
    }
  }
  return result
})

// Параметры ротации
const rotationParams = computed(() => {
  const defs = parameterDefinitions.value
  const result = {}
  for (const key of ['rotationX', 'rotationY', 'rotationZ']) {
    if (defs[key]) {
      result[key] = defs[key]
    }
  }
  return result
})

// локальная копия параметров, с которой работает UI
const editParams = ref({})

// при смене выделенной фигуры синхронизируем копию
watch(
  () => editorStore.selectedShape,
  (ent) => {
    hasUnsavedChanges.value = false
    if (ent && ent.mesh && ent.mesh.userData && ent.mesh.userData.params) {
      editParams.value = JSON.parse(JSON.stringify(ent.mesh.userData.params))
    } else {
      editParams.value = {}
    }
  },
  { immediate: true }
)

// если параметры изменились извне (undo/redo) и пользователь не в середине редактирования,
// подхватим новые значения
watch(
  () => editorStore.selectedShapeParams,
  (p) => {
    if (!hasUnsavedChanges.value && p) {
      editParams.value = JSON.parse(JSON.stringify(p))
    }
  }
)

const markAsChanged = () => {
  hasUnsavedChanges.value = true
}

const applyChanges = () => {
  if (!editorStore.selectedShape) return
  // Передаем копию, чтобы команда могла сравнить старое и новое состояние
  editorStore.updateShapeParams(editParams.value)
  hasUnsavedChanges.value = false
}

</script>



<template>
  <div class="shape-board">
    <div v-if="shapeInstance" class="params-container">
      <div class="board-header">
        <h3>{{ shapeName }}</h3>
        <button 
          @click="applyChanges" 
          class="apply-btn"
          :class="{ 'needs-update': hasUnsavedChanges }"
        >
          Обновить модель
        </button>
      </div>
      
      <!-- Параметры геометрии фигуры -->
      <div v-for="(paramDef, paramKey) in geometryParams" :key="paramKey" class="param-row">
        <label class="param-label">{{ paramDef.label }}</label>

        <template v-if="paramDef.type === 'number'">
          <input 
            type="number" 
            v-model.number="editParams[paramKey]" 
            :min="paramDef.min" 
            :step="paramDef.step"
            @input="markAsChanged" 
          />
        </template>

        <template v-else-if="paramDef.type === 'object'">
          <div v-if="paramKey === 'apex'" class="vector-inputs">
            <div v-for="n in 3" :key="n" class="vec-coord">
                <span>{{ ['X','Y','Z'][n-1] }}:</span>
                <input 
                  type="number" 
                  v-model.number="editParams[paramKey][n-1]" 
                  step="0.1" 
                  @input="markAsChanged"
                />
            </div>
          </div>
          
          <Polyline2DEditor 
            v-else
            v-model="editParams[paramKey]"
            :label="paramDef.label"
            :is-polygon="paramKey.toLowerCase().includes('polygon')"
            @change="markAsChanged"
          />
        </template>
      </div>

      <!-- Группа параметров позиции -->
      <div v-if="Object.keys(positionParams).length > 0" class="param-group-section">
        <div class="group-title">🎯 Позиция</div>
        <div v-for="(paramDef, paramKey) in positionParams" :key="paramKey" class="param-row">
          <label class="param-label">{{ paramDef.label }}</label>
          <input 
            type="number" 
            v-model.number="editParams[paramKey]" 
            :step="paramDef.step"
            @input="markAsChanged" 
          />
        </div>
      </div>

      <!-- Группа параметров ротации -->
      <div v-if="Object.keys(rotationParams).length > 0" class="param-group-section">
        <div class="group-title">🔄 Поворот (рад)</div>
        <div v-for="(paramDef, paramKey) in rotationParams" :key="paramKey" class="param-row">
          <label class="param-label">{{ paramDef.label }}</label>
          <input 
            type="number" 
            v-model.number="editParams[paramKey]" 
            :step="paramDef.step"
            @input="markAsChanged" 
          />
        </div>
      </div>
    </div>
    
    <div v-else class="no-selection">
      Выберите фигуру на сцене
    </div>
  </div>  

</template>



<style scoped>
.shape-board { min-height: 100%; height: fit-content; display: flex; flex-direction: column; }
.board-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.apply-btn { 
  padding: 8px 12px; background: #eee; border: 1px solid #ccc; cursor: pointer; border-radius: 4px; 
  transition: all 0.3s;
}
.apply-btn.needs-update { background: #4caf50; color: white; border-color: #388e3c; font-weight: bold; box-shadow: 0 0 10px rgba(76, 175, 80, 0.4); }
.param-row { margin-bottom: 15px; border-bottom: 1px solid #f5f5f5; padding-bottom: 15px; }
.param-label { display: block; font-weight: bold; margin-bottom: 8px; font-size: 0.85rem; color: #444; }
.vector-inputs { display: flex; gap: 8px; }
.vec-coord input { width: 55px; padding: 3px; }
.no-selection { color: #aaa; text-align: center; padding-top: 100px; }

/* Стили для групп параметров */
.param-group-section { 
  margin-top: 20px; 
  padding-top: 15px; 
  border-top: 2px solid #e0e0e0;
}
.group-title { 
  font-weight: bold; 
  font-size: 0.9rem; 
  color: #666; 
  margin-bottom: 12px; 
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>