<script setup>
import { ref, onMounted, computed } from 'vue'
import { BezierCurve } from '@/core/curves/BezierCurve'
import * as THREE from 'three'

const props = defineProps({
  curve: BezierCurve,
  title: String
})

const emit = defineEmits(['update:curve'])

const canvasRef = ref(null)
const selectedPointIndex = ref(-1)
const isDragging = ref(false)

const canvas = computed(() => canvasRef.value)

// Параметры визуализации
const scale = 100
const pointRadius = 8
const controlLineColor = '#999'
const curveLineColor = '#2563eb'
const pointColor = '#374151'
const selectedPointColor = '#dc2626'
const hoveredPointColor = '#f59e0b'

let ctx = null
let hoveredPointIndex = -1

onMounted(() => {
  if (!canvas.value) return
  ctx = canvas.value.getContext('2d')
  
  // Устанавливаем размер canvas
  const rect = canvas.value.parentElement.getBoundingClientRect()
  canvas.value.width = rect.width
  canvas.value.height = rect.height
  
  // Рисуем начальное состояние
  redraw()
  
  // Слушатели событий
  canvas.value.addEventListener('mousemove', onMouseMove)
  canvas.value.addEventListener('mousedown', onMouseDown)
  canvas.value.addEventListener('mouseup', onMouseUp)
  canvas.value.addEventListener('mouseleave', onMouseLeave)
})

function redraw() {
  if (!ctx || !props.curve) return
  
  const width = canvas.value.width
  const height = canvas.value.height
  const centerX = width / 2
  const centerY = height / 2
  
  // Очищаем canvas
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  
  // Рисуем сетку
  drawGrid(centerX, centerY)
  
  // Рисуем линии управления (между контрольными точками)
  drawControlLines(centerX, centerY)
  
  // Рисуем кривую
  drawCurve(centerX, centerY)
  
  // Рисуем контрольные точки
  drawControlPoints(centerX, centerY)
}

function drawGrid(centerX, centerY) {
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  
  // Вертикальная сетка
  for (let i = -5; i <= 5; i++) {
    const x = centerX + i * scale
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvas.value.height)
    ctx.stroke()
  }
  
  // Горизонтальная сетка
  for (let i = -5; i <= 5; i++) {
    const y = centerY + i * scale
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvas.value.width, y)
    ctx.stroke()
  }
  
  // Оси координат
  ctx.strokeStyle = '#6b7280'
  ctx.lineWidth = 2
  
  // X ось
  ctx.beginPath()
  ctx.moveTo(0, centerY)
  ctx.lineTo(canvas.value.width, centerY)
  ctx.stroke()
  
  // Y ось
  ctx.beginPath()
  ctx.moveTo(centerX, 0)
  ctx.lineTo(centerX, canvas.value.height)
  ctx.stroke()
}

function drawControlLines(centerX, centerY) {
  if (!props.curve || props.curve.getControlPointCount() < 2) return
  
  ctx.strokeStyle = controlLineColor
  ctx.lineWidth = 1
  ctx.setLineDash([5, 5])
  
  const count = props.curve.getControlPointCount()
  for (let i = 0; i < count; i++) {
    const p1 = props.curve.getControlPoint(i)
    const p2 = props.curve.getControlPoint((i + 1) % count)
    
    ctx.beginPath()
    ctx.moveTo(centerX + p1.x * scale, centerY - p1.y * scale)
    ctx.lineTo(centerX + p2.x * scale, centerY - p2.y * scale)
    ctx.stroke()
  }
  
  ctx.setLineDash([])
}

function drawCurve(centerX, centerY) {
  if (!props.curve) return
  
  const points = props.curve.getPoints(100)
  
  ctx.strokeStyle = curveLineColor
  ctx.lineWidth = 2
  ctx.beginPath()
  
  points.forEach((p, i) => {
    const x = centerX + p.x * scale
    const y = centerY - p.y * scale
    
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  
  if (props.curve.closed && points.length > 0) {
    const p = points[0]
    ctx.lineTo(centerX + p.x * scale, centerY - p.y * scale)
  }
  
  ctx.stroke()
}

function drawControlPoints(centerX, centerY) {
  if (!props.curve) return
  
  const count = props.curve.getControlPointCount()
  
  for (let i = 0; i < count; i++) {
    const p = props.curve.getControlPoint(i)
    const x = centerX + p.x * scale
    const y = centerY - p.y * scale
    
    // Выбираем цвет
    let color = pointColor
    if (i === selectedPointIndex.value) {
      color = selectedPointColor
    } else if (i === hoveredPointIndex) {
      color = hoveredPointColor
    }
    
    // Рисуем окружность
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, pointRadius, 0, Math.PI * 2)
    ctx.fill()
    
    // Рисуем границу
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.stroke()
    
    // Рисуем номер
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 10px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(i, x, y)
  }
}

function screenToWorld(screenX, screenY) {
  const rect = canvas.value.getBoundingClientRect()
  const width = canvas.value.width
  const height = canvas.value.height
  const centerX = width / 2
  const centerY = height / 2
  
  const x = (screenX - rect.left - centerX) / scale
  const y = -(screenY - rect.top - centerY) / scale
  
  return new THREE.Vector2(x, y)
}

function getControlPointAtScreen(screenX, screenY) {
  const rect = canvas.value.getBoundingClientRect()
  const x = screenX - rect.left
  const y = screenY - rect.top
  
  const width = canvas.value.width
  const height = canvas.value.height
  const centerX = width / 2
  const centerY = height / 2
  
  if (!props.curve) return -1
  
  const count = props.curve.getControlPointCount()
  for (let i = 0; i < count; i++) {
    const p = props.curve.getControlPoint(i)
    const px = centerX + p.x * scale
    const py = centerY - p.y * scale
    
    const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2)
    if (dist <= pointRadius * 2) {
      return i
    }
  }
  
  return -1
}

function onMouseMove(e) {
  if (!canvas.value) return
  
  // Обновляем hovered точку
  const oldHovered = hoveredPointIndex
  hoveredPointIndex = getControlPointAtScreen(e.clientX, e.clientY)
  
  if (isDragging.value && selectedPointIndex.value >= 0) {
    const worldPos = screenToWorld(e.clientX, e.clientY)
    const newCurve = props.curve.clone()
    newCurve.setControlPoint(selectedPointIndex.value, worldPos)
    emit('update:curve', newCurve)
  } else if (oldHovered !== hoveredPointIndex) {
    redraw()
  }
}

function onMouseDown(e) {
  const index = getControlPointAtScreen(e.clientX, e.clientY)
  if (index >= 0) {
    selectedPointIndex.value = index
    isDragging.value = true
  }
}

function onMouseUp() {
  isDragging.value = false
}

function onMouseLeave() {
  hoveredPointIndex = -1
  isDragging.value = false
  redraw()
}
</script>

<template>
  <div class="curve-editor">
    <div class="editor-header">
      <h3>{{ title || 'Curve Editor' }}</h3>
      <div class="info">
        Control points: {{ curve?.getControlPointCount() || 0 }}
      </div>
    </div>
    <div class="canvas-container">
      <canvas ref="canvasRef" class="editor-canvas"></canvas>
    </div>
    <div class="editor-footer">
      <p class="hint">Drag control points to edit the curve</p>
    </div>
  </div>
</template>

<style scoped>
.curve-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
}

.editor-header {
  padding: 10px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.info {
  font-size: 12px;
  color: #6b7280;
}

.canvas-container {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.editor-canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: crosshair;
}

.editor-footer {
  padding: 8px 10px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  font-size: 12px;
}

.hint {
  margin: 0;
  color: #6b7280;
}
</style>
