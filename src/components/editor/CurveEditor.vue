<script setup>
import { ref, onMounted } from 'vue'
import { BezierCurve } from '@/core/curves/BezierCurve'
import { CanvasEditor } from '@/utils/CanvasEditor'
import * as THREE from 'three'

const props = defineProps({
  curve: BezierCurve,
  title: String
})

const emit = defineEmits(['update:curve'])

const canvasRef = ref(null)
const selectedPointIndex = ref(-1)
const isDragging = ref(false)

let editor = null
const pointRadius = 8

onMounted(() => {
  if (!canvasRef.value) return
  
  editor = new CanvasEditor(canvasRef.value, {
    pointRadius,
    colors: {
      curve: '#2563eb',
      point: '#374151',
      selectedPoint: '#dc2626',
      hoveredPoint: '#f59e0b'
    }
  })
  
  const rect = canvasRef.value.parentElement.getBoundingClientRect()
  canvasRef.value.width = rect.width
  canvasRef.value.height = rect.height
  
  setupEventHandlers()
  redraw()
  
  window.addEventListener('resize', () => {
    const rect = canvasRef.value.parentElement.getBoundingClientRect()
    canvasRef.value.width = rect.width
    canvasRef.value.height = rect.height
    redraw()
  })
})

function setupEventHandlers() {
  canvasRef.value.addEventListener('mousemove', onMouseMove)
  canvasRef.value.addEventListener('mousedown', onMouseDown)
  canvasRef.value.addEventListener('mouseup', onMouseUp)
  canvasRef.value.addEventListener('mouseleave', onMouseLeave)
  canvasRef.value.addEventListener('wheel', onWheel, { passive: false })
}

function redraw() {
  if (!editor || !canvasRef.value || !props.curve) return
  
  const width = canvasRef.value.width
  const height = canvasRef.value.height
  const centerX = width / 2 + editor.panX
  const centerY = height / 2 + editor.panY
  
  editor.ctx.fillStyle = editor.colors.background
  editor.ctx.fillRect(0, 0, width, height)
  
  editor.drawGrid()
  drawControlLines(centerX, centerY)
  drawCurve(centerX, centerY)
  drawControlPoints(centerX, centerY)
}

function drawControlLines(centerX, centerY) {
  if (!props.curve || props.curve.getControlPointCount() < 2) return
  
  editor.ctx.strokeStyle = editor.colors.controlLine
  editor.ctx.lineWidth = 1
  editor.ctx.setLineDash([5, 5])
  
  const count = props.curve.getControlPointCount()
  for (let i = 0; i < count; i++) {
    const p1 = props.curve.getControlPoint(i)
    const p2 = props.curve.getControlPoint((i + 1) % count)
    
    editor.ctx.beginPath()
    editor.ctx.moveTo(centerX + p1.x * editor.scale, centerY - p1.y * editor.scale)
    editor.ctx.lineTo(centerX + p2.x * editor.scale, centerY - p2.y * editor.scale)
    editor.ctx.stroke()
  }
  
  editor.ctx.setLineDash([])
}

function drawCurve(centerX, centerY) {
  if (!props.curve) return
  
  const points = props.curve.getPoints(100)
  
  editor.ctx.strokeStyle = editor.colors.curve
  editor.ctx.lineWidth = 2
  editor.ctx.beginPath()
  
  points.forEach((p, i) => {
    const x = centerX + p.x * editor.scale
    const y = centerY - p.y * editor.scale
    
    if (i === 0) editor.ctx.moveTo(x, y)
    else editor.ctx.lineTo(x, y)
  })
  
  if (props.curve.closed && points.length > 0) {
    const p = points[0]
    editor.ctx.lineTo(centerX + p.x * editor.scale, centerY - p.y * editor.scale)
  }
  
  editor.ctx.stroke()
}

function drawControlPoints(centerX, centerY) {
  if (!props.curve) return
  
  const count = props.curve.getControlPointCount()
  
  for (let i = 0; i < count; i++) {
    const p = props.curve.getControlPoint(i)
    const x = centerX + p.x * editor.scale
    const y = centerY - p.y * editor.scale
    
    let color = editor.colors.point
    if (i === selectedPointIndex.value) {
      color = editor.colors.selectedPoint
    } else if (i === editor.hoveredPointIndex) {
      color = editor.colors.hoveredPoint
    }
    
    editor.ctx.fillStyle = color
    editor.ctx.beginPath()
    editor.ctx.arc(x, y, pointRadius, 0, Math.PI * 2)
    editor.ctx.fill()
    
    editor.ctx.strokeStyle = '#ffffff'
    editor.ctx.lineWidth = 2
    editor.ctx.stroke()
    
    editor.ctx.fillStyle = '#ffffff'
    editor.ctx.font = 'bold 10px Arial'
    editor.ctx.textAlign = 'center'
    editor.ctx.textBaseline = 'middle'
    editor.ctx.fillText(i, x, y)
  }
}

function getControlPointAtScreen(screenX, screenY) {
  if (!editor || !canvasRef.value || !props.curve) return -1
  
  const rect = canvasRef.value.getBoundingClientRect()
  const x = screenX - rect.left
  const y = screenY - rect.top
  
  const width = canvasRef.value.width
  const height = canvasRef.value.height
  const centerX = width / 2 + editor.panX
  const centerY = height / 2 + editor.panY
  
  const count = props.curve.getControlPointCount()
  for (let i = 0; i < count; i++) {
    const p = props.curve.getControlPoint(i)
    const px = centerX + p.x * editor.scale
    const py = centerY - p.y * editor.scale
    
    const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2)
    if (dist <= pointRadius * 2) {
      return i
    }
  }
  
  return -1
}

function screenToWorld(screenX, screenY) {
  if (!editor || !canvasRef.value) return new THREE.Vector2()
  
  const rect = canvasRef.value.getBoundingClientRect()
  const x = screenX - rect.left
  const y = screenY - rect.top
  
  const width = canvasRef.value.width
  const height = canvasRef.value.height
  const centerX = width / 2 + editor.panX
  const centerY = height / 2 + editor.panY
  
  const worldX = (x - centerX) / editor.scale
  const worldY = -(y - centerY) / editor.scale
  
  return new THREE.Vector2(worldX, worldY)
}

function onMouseMove(e) {
  if (!editor) return
  
  if (editor.isPanning) {
    const deltaX = e.clientX - editor.lastPanX
    const deltaY = e.clientY - editor.lastPanY
    editor.panX += deltaX
    editor.panY += deltaY
    editor.lastPanX = e.clientX
    editor.lastPanY = e.clientY
    redraw()
    return
  }
  
  const oldHovered = editor.hoveredPointIndex
  editor.hoveredPointIndex = getControlPointAtScreen(e.clientX, e.clientY)
  
  if (isDragging.value && selectedPointIndex.value >= 0) {
    const worldPos = screenToWorld(e.clientX, e.clientY)
    const newCurve = props.curve.clone()
    newCurve.setControlPoint(selectedPointIndex.value, worldPos)
    emit('update:curve', newCurve)
  } else if (oldHovered !== editor.hoveredPointIndex) {
    redraw()
  }
}

function onMouseDown(e) {
  if (!editor) return
  
  if (e.button === 1) {
    e.preventDefault()
    editor.isPanning = true
    editor.lastPanX = e.clientX
    editor.lastPanY = e.clientY
    return
  }
  
  const index = getControlPointAtScreen(e.clientX, e.clientY)
  if (index >= 0) {
    selectedPointIndex.value = index
    isDragging.value = true
  }
}

function onMouseUp(e) {
  if (e.button === 1) {
    editor.isPanning = false
    return
  }
  isDragging.value = false
}

function onMouseLeave() {
  if (editor) editor.hoveredPointIndex = -1
  isDragging.value = false
  redraw()
}

function onWheel(e) {
  if (!editor) return
  
  e.preventDefault()
  
  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
  const oldScale = editor.scale
  editor.scale *= zoomFactor
  
  editor.scale = Math.max(20, Math.min(editor.scale, 500))
  
  const scaleDiff = editor.scale - oldScale
  editor.panX -= scaleDiff * 0.1
  editor.panY -= scaleDiff * 0.1
  
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
