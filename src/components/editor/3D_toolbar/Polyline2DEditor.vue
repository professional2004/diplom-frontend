<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import Polyline2DEditorClass from '@/editor_core/general/utils/Polyline2DEditor.js'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  label: String,
  isPolygon: Boolean,
  shapeInstance: { type: Object, default: null },
  paramKey: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'change'])

// container for WebGL canvas
const canvasRef = ref(null)
let editorInstance = null

const createEditor = () => {
  if (!canvasRef.value) return
  editorInstance = new Polyline2DEditorClass(canvasRef.value, {
    points: props.modelValue,
    isPolygon: props.isPolygon,
    shapeInstance: props.shapeInstance,
    paramKey: props.paramKey,
    onChange: (pts) => {
      emit('update:modelValue', pts.map(p => [p[0], p[1]]))
      emit('change')
    }
  })
}

// keep editor in sync when parent modelValue changes
watch(
  () => props.modelValue,
  (nv) => {
    if (editorInstance) {
      editorInstance.setPoints(nv)
    }
  },
  { deep: true }
)

watch(
  () => props.isPolygon,
  (v) => {
    if (editorInstance) editorInstance.setPolygon(v)
  }
)

watch(
  () => props.shapeInstance?.params,
  () => {
    if (editorInstance) {
      editorInstance.updateShapeContext(props.shapeInstance, props.paramKey)
    }
  },
  { deep: true }
)

onMounted(() => {
  createEditor()
})

onBeforeUnmount(() => {
  if (editorInstance) {
    editorInstance.dispose()
    editorInstance = null
  }
})

const resetPoints = () => {
  if (editorInstance) {
    editorInstance.resetPoints()
  } else {
    emit('update:modelValue', [[-1, 0], [1, 0]])
    emit('change')
  }
}
</script>




<template>
  <div class="polyline-editor-container">
    <div class="editor-toolbar">
      <span class="label-text">{{ label }}</span>
      <div class="actions">
        <button @click="resetPoints" class="btn-sm btn-danger" title="Сбросить к начальным точкам">Сброс</button>
      </div>
    </div>

    <!-- three.js will insert a canvas into this div -->
    <div ref="canvasRef" class="editor-canvas"></div>

    <div class="hint">Double-click по полю: +точка | Drag: двигать | Double-click по точке: -точка | колесо: масштаб | перетаскивание: панорама</div>
  </div>
</template>



<style scoped>
.polyline-editor-container { border: 1px solid #ccc; margin-top: 5px; background: #fff; }
.editor-toolbar { background: #eee; padding: 4px 8px; display: flex; justify-content: space-between; align-items: center; }
.label-text { font-size: 12px; color: #555; }
.editor-canvas { width: 100%; height: 200px; position: relative; cursor: crosshair; }
.hint { font-size: 10px; color: #888; padding: 4px; text-align: center; background: #f9f9f9; }
.btn-sm { padding: 2px 6px; font-size: 10px; cursor: pointer; }
.btn-danger { color: #d00; border: 1px solid #faa; background: #fff; }
</style>