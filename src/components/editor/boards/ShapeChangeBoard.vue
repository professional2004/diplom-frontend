<script setup>
import { ref, computed, watch } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import Polyline2DEditor from '../utils/Polyline2DEditor.vue'

const editorStore = useEditorStore()
const hasUnsavedChanges = ref(false)

// активная фигура (логический объект) – используется для определения
// описания параметров и названия. Не содержит сами значения.
const shapeInstance = computed(() => {
  const selected = editorStore.selectedShape
  return selected?.userData?.owner || selected
})

const shapeName = computed(() => {
  if (!shapeInstance.value) return ''
  return shapeInstance.value.userData?.shapeType || shapeInstance.value.constructor.name
})

const parameterDefinitions = computed(() => {
  return shapeInstance.value?.parameterDefinitions || {}
})

// локальная копия параметров, с которой работает UI
const editParams = ref({})

// при смене выделенной фигуры синхронизируем копию
watch(
  () => editorStore.selectedShape,
  (shape) => {
    hasUnsavedChanges.value = false
    if (shape && shape.userData && shape.userData.params) {
      // делаем неглубокую копию, т.к. значения могут быть объектами/массивами
      editParams.value = JSON.parse(JSON.stringify(shape.userData.params))
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
      
      <div v-for="(paramDef, paramKey) in parameterDefinitions" :key="paramKey" class="param-row">
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
    </div>
    
    <div v-else class="no-selection">
      Выберите фигуру на сцене
    </div>
  </div>
</template>



<style scoped>
.shape-board { padding: 15px; background: #fff; height: 100%; display: flex; flex-direction: column; }
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
</style>