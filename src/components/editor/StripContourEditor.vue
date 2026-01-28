<script setup>
import { ref, onMounted } from 'vue'
import { BezierCurve } from '@/core/curves/BezierCurve'
import * as THREE from 'three'

const props = defineProps({
  contour: BezierCurve,
  unfoldBounds: {
    type: Object,
    default: () => ({ min: { x: -5, y: -5 }, max: { x: 5, y: 5 } })
  },
  title: String
})

const emit = defineEmits(['update:contour'])

const canvasRef = ref(null)
const selectedPointIndex = ref(-1)
const isDragging = ref(false)
const isPanning = ref(false)
const lastPanX = ref(0)
const lastPanY = ref(0)

// Visualization parameters
let scale = 100           // pixels per unit
let panX = 0              // pan offset X
let panY = 0              // pan offset Y
let hoveredPointIndex = -1

const pointRadius = 8
const controlLineColor = '#999'
const curveLineColor = '#ff0000'
const pointColor = '#ff0000'
const selectedPointColor = '#cc0000'
const hoveredPointColor = '#ff6666'
const unfoldBoundsColor = '#cccccc'

let ctx = null

onMounted(() => {
  if (!canvasRef.value) return
  ctx = canvasRef.value.getContext('2d')
  
  const rect = canvasRef.value.parentElement.getBoundingClientRect()
  canvasRef.value.width = rect.width
  canvasRef.value.height = rect.height
  
  redraw()
  
  canvasRef.value.addEventListener('mousemove', onMouseMove)
  canvasRef.value.addEventListener('mousedown', onMouseDown)
  canvasRef.value.addEventListener('mouseup', onMouseUp)
  canvasRef.value.addEventListener('mouseleave', onMouseLeave)
  canvasRef.value.addEventListener('wheel', onWheel, { passive: false })
})

function redraw() {
  if (!ctx || !canvasRef.value || !props.contour) return
  
  const width = canvasRef.value.width
  const height = canvasRef.value.height
  const centerX = width / 2
  const centerY = height / 2
  
  // Очищаем canvas
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  
  // Рисуем границы развертки
  drawUnfoldBounds(centerX, centerY)
  
  // Рисуем сетку
  drawGrid(centerX, centerY)
  
  // Рисуем линии управления
  drawControlLines(centerX, centerY)
  
  // Рисуем кривую контура
  drawCurve(centerX, centerY)
  
  // Рисуем контрольные точки
  drawControlPoints(centerX, centerY)
}

function drawUnfoldBounds(centerX, centerY) {
  const { min, max } = props.unfoldBounds
  
  ctx.strokeStyle = unfoldBoundsColor
  ctx.lineWidth = 2
  
  const x1 = centerX + min.x * scale
  const y1 = centerY - min.y * scale
  const x2 = centerX + max.x * scale
  const y2 = centerY - max.y * scale
  
  ctx.strokeRect(x1, y2, x2 - x1, y1 - y2)
  
  // Пишем подпись
  ctx.fillStyle = unfoldBoundsColor
  ctx.font = '12px Arial'
  ctx.fillText('Unfolding bounds', x1 + 5, y1 - 5)
}

function drawGrid(centerX, centerY) {
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  
  for (let i = -5; i <= 5; i++) {
    const x = centerX + i * scale
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvasRef.value.height)
    ctx.stroke()
  }
  
  for (let i = -5; i <= 5; i++) {
    const y = centerY + i * scale
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvasRef.value.width, y)
    ctx.stroke()
  }
  
  // Оси
  ctx.strokeStyle = '#6b7280'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, centerY)
  ctx.lineTo(canvasRef.value.width, centerY)
  ctx.stroke()
  
  ctx.beginPath()
  ctx.moveTo(centerX, 0)
  ctx.lineTo(centerX, canvasRef.value.height)
  ctx.stroke()
}

function drawControlLines(centerX, centerY) {
  if (!props.contour || props.contour.getControlPointCount() < 2) return
  
  ctx.strokeStyle = controlLineColor
  ctx.lineWidth = 1
  ctx.setLineDash([5, 5])
  
  const count = props.contour.getControlPointCount()
  for (let i = 0; i < count; i++) {
    const p1 = props.contour.getControlPoint(i)
    const p2 = props.contour.getControlPoint((i + 1) % count)
    
    ctx.beginPath()
    ctx.moveTo(centerX + p1.x * scale, centerY - p1.y * scale)
    ctx.lineTo(centerX + p2.x * scale, centerY - p2.y * scale)
    ctx.stroke()
  }
  
  ctx.setLineDash([])
}

function drawCurve(centerX, centerY) {
  if (!props.contour) return
  
  const points = props.contour.getPoints(100)
  
  ctx.strokeStyle = curveLineColor
  ctx.lineWidth = 2
  ctx.beginPath()
  
  points.forEach((p, i) => {
    const x = centerX + p.x * scale
    const y = centerY - p.y * scale
    
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  
  if (props.contour.closed && points.length > 0) {
    const p = points[0]
    ctx.lineTo(centerX + p.x * scale, centerY - p.y * scale)
  }
  
  ctx.stroke()
}

function drawControlPoints(centerX, centerY) {
  if (!props.contour) return
  
  const count = props.contour.getControlPointCount()
  
  for (let i = 0; i < count; i++) {
    const p = props.contour.getControlPoint(i)
    const x = centerX + p.x * scale
    const y = centerY - p.y * scale
    
    let color = pointColor
    if (i === selectedPointIndex.value) {
      color = selectedPointColor
    } else if (i === hoveredPointIndex) {
      color = hoveredPointColor
    }
    
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, pointRadius, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.stroke()
    
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 10px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(i, x, y)
  }
}

function screenToWorld(screenX, screenY) {
  const rect = canvasRef.value.getBoundingClientRect()
  const width = canvasRef.value.width
  const height = canvasRef.value.height
  const centerX = width / 2 + panX
  const centerY = height / 2 + panY
  
  const x = (screenX - rect.left - centerX) / scale
  const y = -(screenY - rect.top - centerY) / scale
  
  return { x, y }
}

function getPointAtScreenPos(screenX, screenY) {
  const rect = canvasRef.value.getBoundingClientRect()
  const width = canvasRef.value.width
  const height = canvasRef.value.height
  const centerX = width / 2 + panX
  const centerY = height / 2 + panY
  
  const count = props.contour.getControlPointCount()
  
  for (let i = 0; i < count; i++) {
    const p = props.contour.getControlPoint(i)
    const x = centerX + p.x * scale
    const y = centerY - p.y * scale
    
    const canvasX = rect.left + x
    const canvasY = rect.top + y
    
    const dx = screenX - canvasX
    const dy = screenY - canvasY
    
    if (Math.sqrt(dx * dx + dy * dy) < pointRadius + 5) {
      return i
    }
  }
  
  return -1
}

function constrainPointToUnfold(worldPos) {
  const { min, max } = props.unfoldBounds
  return {
    x: Math.max(min.x + 0.1, Math.min(max.x - 0.1, worldPos.x)),
    y: Math.max(min.y + 0.1, Math.min(max.y - 0.1, worldPos.y))
  }
}

function onMouseMove(event) {
  const pointIndex = getPointAtScreenPos(event.clientX, event.clientY)
  hoveredPointIndex = pointIndex
  
  if (isDragging.value && selectedPointIndex.value >= 0) {
    const worldPos = screenToWorld(event.clientX, event.clientY)
    const constrained = constrainPointToUnfold(worldPos)
    props.contour.setControlPoint(selectedPointIndex.value, new THREE.Vector2(constrained.x, constrained.y))
    emit('update:contour', props.contour)
  }
  
  redraw()
}

function onMouseDown(event) {
  const pointIndex = getPointAtScreenPos(event.clientX, event.clientY)
  if (pointIndex >= 0) {
    selectedPointIndex.value = pointIndex
    isDragging.value = true
  }
}

function onMouseUp(event) {
  isDragging.value = false
}

function onMouseLeave(event) {
  hoveredPointIndex = -1
  isDragging.value = false
  redraw()
}

function onWheel(event) {
  event.preventDefault()
  // Zoom не реализован для простоты
}
</script>

<template>
  <div class="strip-contour-editor">
    <div class="editor-header">
      <h3>{{ title || 'Strip Contour Editor' }}</h3>
      <p class="editor-help">Drag points to edit. Points must stay within unfolding bounds.</p>
    </div>
    <canvas ref="canvasRef" class="editor-canvas"></canvas>
  </div>
</template>

<style scoped>
.strip-contour-editor {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.editor-header {
  padding: 8px 12px;
  border-bottom: 1px solid #ddd;
  background: #f5f5f5;
}

.editor-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.editor-help {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: #666;
}

.editor-canvas {
  flex: 1;
  cursor: crosshair;
  display: block;
}
</style>
