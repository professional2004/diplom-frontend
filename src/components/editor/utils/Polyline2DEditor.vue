<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  label: String,
  isPolygon: Boolean
})

const emit = defineEmits(['update:modelValue', 'change'])
const svgRef = ref(null)
const dragIndex = ref(null)

const pointsString = computed(() => {
  return props.modelValue.map(p => `${p[0]},${p[1]}`).join(' ')
})

// Преобразование координат экрана в координаты SVG (-5..5)
const getCoords = (e) => {
  const svg = svgRef.value
  const pt = svg.createSVGPoint()
  pt.x = e.clientX
  pt.y = e.clientY
  const loc = pt.matrixTransform(svg.getScreenCTM().inverse())
  // Округляем для удобства
  return [Math.round(loc.x * 10) / 10, Math.round(loc.y * 10) / 10]
}

const startDragging = (idx, e) => {
  if (e.button !== 0) return // Только левая кнопка
  dragIndex.value = idx
}

const handleMouseMove = (e) => {
  if (dragIndex.value === null) return
  const coords = getCoords(e)
  const newVal = [...props.modelValue]
  newVal[dragIndex.value] = coords
  emit('update:modelValue', newVal)
}

const stopDragging = () => {
  if (dragIndex.value !== null) {
    emit('change') // Сигнал об окончании движения
  }
  dragIndex.value = null
}

const addPoint = (e) => {
  // Предотвращаем срабатывание, если мы кликнули не левой кнопкой мыши
  if (e.button !== 0) return
  
  const newPt = getCoords(e)
  // Создаем копию массива, чтобы Vue увидел изменение
  const newVal = [...props.modelValue, newPt]
  emit('update:modelValue', newVal)
  emit('change') 
}

const removePoint = (idx) => {
  // Не даем удалить, если осталось меньше 2 или 3 точек (зависит от логики)
  if (props.modelValue.length <= (props.isPolygon ? 3 : 2)) return
  const newVal = props.modelValue.filter((_, i) => i !== idx)
  emit('update:modelValue', newVal)
  emit('change')
}

const resetPoints = () => {
  emit('update:modelValue', [[-1, 0], [1, 0]])
  emit('change')
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

    <svg 
      class="svg-canvas" 
      viewBox="-5 -5 10 10" 
      ref="svgRef"
      @mousemove="handleMouseMove"
      @mouseup="stopDragging"
      @mouseleave="stopDragging"
    >
      <defs>
        <pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse">
          <path d="M 1 0 L 0 0 0 1" fill="none" stroke="rgba(0,0,0,0.1)" stroke-width="0.05"/>
        </pattern>
      </defs>
      <rect x="-5" y="-5" width="10" height="10" fill="url(#grid)" @dblclick="addPoint" />
      
      <polyline 
        v-if="!isPolygon"
        :points="pointsString"
        fill="none"
        stroke="#4a90e2"
        stroke-width="0.1"
        style="pointer-events: none;"
      />
      <polygon 
        v-else
        :points="pointsString"
        fill="rgba(66, 153, 225, 0.2)"
        stroke="#4a90e2"
        stroke-width="0.1"
        style="pointer-events: none;"
      />

      <circle
        v-for="(pt, idx) in modelValue"
        :key="idx"
        :cx="pt[0]"
        :cy="pt[1]"
        r="0.25"
        class="draggable-point"
        @mousedown.stop="startDragging(idx, $event)"
        @dblclick.stop="removePoint(idx)"
      />
    </svg>
    <div class="hint">Double-click по полю: +точка | Drag: двигать | Double-click по точке: -точка</div>
  </div>
</template>



<style scoped>
.polyline-editor-container { border: 1px solid #ccc; margin-top: 5px; background: #fff; }
.editor-toolbar { background: #eee; padding: 4px 8px; display: flex; justify-content: space-between; align-items: center; }
.label-text { font-size: 12px; color: #555; }
.svg-canvas { width: 100%; height: 200px; display: block; cursor: crosshair; }
.draggable-point { fill: #fff; stroke: #4a90e2; stroke-width: 0.1; cursor: grab; transition: r 0.1s; }
.draggable-point:hover { r: 0.35; fill: #4a90e2; }
.draggable-point:active { cursor: grabbing; }
.hint { font-size: 10px; color: #888; padding: 4px; text-align: center; background: #f9f9f9; }
.btn-sm { padding: 2px 6px; font-size: 10px; cursor: pointer; }
.btn-danger { color: #d00; border: 1px solid #faa; background: #fff; }
</style>