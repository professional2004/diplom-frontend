<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { UnfoldManager } from '@/core/unfold/UnfoldManager'
import * as THREE from 'three'

const containerRef = ref(null)
const canvasOverlayRef = ref(null)
const store = useEditorStore()
let manager = null
let raf = null
let overlayCtx = null

// Состояние редактирования контура
const editingContour = ref(false)

// Используем computed для связи с выбранной поверхностью
const selectedMesh = computed(() => store.selectedSurface)

// Убираем sync из loop!
const loop = () => {
   manager.update()
   manager.render()
   raf = requestAnimationFrame(loop)
}

// Добавляем слежение за историей (как индикатор изменений)
watch(
  () => store.engine?.historySystem?.index, 
  () => {
     if (store.engine?.sceneSystem?.scene) {
        manager.sync(store.engine.sceneSystem.scene)
     }
  }
)

// Следим за режимом редактирования
watch(
  editingContour,
  () => {
    redrawOverlay()
  }
)

// Вспомогательные функции преобразования координат
function screenToWorld(screenX, screenY) {
  const rect = canvasOverlayRef.value.getBoundingClientRect()
  const x = screenX - rect.left
  const y = screenY - rect.top
  
  // Преобразуем экранные координаты через Three.js камеру
  const ndcX = (x / rect.width) * 2 - 1
  const ndcY = -(y / rect.height) * 2 + 1
  
  const unfoldObj = manager.getUnfoldObject(selectedMesh.value)
  if (!unfoldObj || !unfoldObj.unfoldGroup) return { x: 0, y: 0 }
  
  // Получаем мировые координаты из Three.js
  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera({ x: ndcX, y: ndcY }, manager.camera)
  
  const intersects = raycaster.intersectObject(unfoldObj.unfoldGroup)
  if (intersects.length > 0) {
    const point = intersects[0].point
    return { x: point.x, y: point.y }
  }
  
  return { x: 0, y: 0 }
}

function worldToScreen(x, y) {
  const pos = new THREE.Vector3(x, y, 0)
  pos.project(manager.camera)
  
  const rect = canvasOverlayRef.value.getBoundingClientRect()
  const screenX = (pos.x + 1) / 2 * rect.width
  const screenY = -(pos.y - 1) / 2 * rect.height
  
  return { x: screenX + rect.left, y: screenY + rect.top }
}

function redrawOverlay() {
  if (!overlayCtx || !editingContour.value || !selectedMesh.value) {
    // Очищаем overlay если редактирование отключено
    if (overlayCtx) {
      overlayCtx.clearRect(0, 0, canvasOverlayRef.value.width, canvasOverlayRef.value.height)
    }
    return
  }
  
  const unfoldObj = manager.getUnfoldObject(selectedMesh.value)
  if (!unfoldObj || !unfoldObj.strip) return
  
  overlayCtx.clearRect(0, 0, canvasOverlayRef.value.width, canvasOverlayRef.value.height)
  
  const contour = unfoldObj.strip.getStripContour()
  const points = contour.getPoints(100)
  
  // Рисуем линии управления
  overlayCtx.strokeStyle = '#999999'
  overlayCtx.lineWidth = 1
  overlayCtx.setLineDash([5, 5])
  
  const count = contour.getControlPointCount()
  for (let i = 0; i < count; i++) {
    const p1 = contour.getControlPoint(i)
    const p2 = contour.getControlPoint((i + 1) % count)
    
    const pos1 = worldToScreen(p1.x, p1.y)
    const pos2 = worldToScreen(p2.x, p2.y)
    
    overlayCtx.beginPath()
    overlayCtx.moveTo(pos1.x, pos1.y)
    overlayCtx.lineTo(pos2.x, pos2.y)
    overlayCtx.stroke()
  }
  overlayCtx.setLineDash([])
  
  // Рисуем кривую контура
  overlayCtx.strokeStyle = '#ff0000'
  overlayCtx.lineWidth = 2
  overlayCtx.beginPath()
  
  points.forEach((p, i) => {
    const pos = worldToScreen(p.x, p.y)
    if (i === 0) overlayCtx.moveTo(pos.x, pos.y)
    else overlayCtx.lineTo(pos.x, pos.y)
  })
  
  if (contour.closed && points.length > 0) {
    const p = points[0]
    const pos = worldToScreen(p.x, p.y)
    overlayCtx.lineTo(pos.x, pos.y)
  }
  overlayCtx.stroke()
  
  // Рисуем контрольные точки
  for (let i = 0; i < count; i++) {
    const p = contour.getControlPoint(i)
    const pos = worldToScreen(p.x, p.y)
    
    let color = '#ff0000'
    if (i === draggingPointIndex) {
      color = '#cc0000'
    }
    
    overlayCtx.fillStyle = color
    overlayCtx.beginPath()
    overlayCtx.arc(pos.x, pos.y, 6, 0, Math.PI * 2)
    overlayCtx.fill()
    
    overlayCtx.strokeStyle = '#ffffff'
    overlayCtx.lineWidth = 2
    overlayCtx.stroke()
  }
}

const handleResize = () => {
  if (containerRef.value && manager) {
    manager.resize(containerRef.value.clientWidth, containerRef.value.clientHeight)
    
    // Обновляем overlay canvas
    if (canvasOverlayRef.value) {
      canvasOverlayRef.value.width = containerRef.value.clientWidth
      canvasOverlayRef.value.height = containerRef.value.clientHeight
    }
  }
}

onMounted(() => {
  if (!containerRef.value) return
  manager = new UnfoldManager(containerRef.value)

  // Инициализируем overlay canvas для редактирования контура
  if (canvasOverlayRef.value) {
    overlayCtx = canvasOverlayRef.value.getContext('2d')
    canvasOverlayRef.value.width = containerRef.value.clientWidth
    canvasOverlayRef.value.height = containerRef.value.clientHeight
  }

  const loop = () => {
    if (store.engine?.sceneSystem?.scene) {
      manager.sync(store.engine.sceneSystem.scene)
    }
    manager.update()
    manager.render()
    raf = requestAnimationFrame(loop)
  }
  loop()
  window.addEventListener('resize', handleResize)
  
  // Обработчики для редактирования контура
  if (canvasOverlayRef.value) {
    canvasOverlayRef.value.addEventListener('mousemove', handleOverlayMouseMove)
    canvasOverlayRef.value.addEventListener('mousedown', handleOverlayMouseDown)
    canvasOverlayRef.value.addEventListener('mouseup', handleOverlayMouseUp)
    canvasOverlayRef.value.addEventListener('mouseleave', handleOverlayMouseLeave)
  }
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  window.removeEventListener('resize', handleResize)
  manager?.dispose()
  
  if (canvasOverlayRef.value) {
    canvasOverlayRef.value.removeEventListener('mousemove', handleOverlayMouseMove)
    canvasOverlayRef.value.removeEventListener('mousedown', handleOverlayMouseDown)
    canvasOverlayRef.value.removeEventListener('mouseup', handleOverlayMouseUp)
    canvasOverlayRef.value.removeEventListener('mouseleave', handleOverlayMouseLeave)
  }
})

// Обработчики для overlay canvas редактирования
let draggingPointIndex = -1
let isDraggingOverlay = false

function handleOverlayMouseMove(e) {
  if (!editingContour.value || !selectedMesh.value) return
  
  if (isDraggingOverlay && draggingPointIndex >= 0) {
    // Обновляем позицию контрольной точки
    const unfoldObj = manager.getUnfoldObject(selectedMesh.value)
    if (unfoldObj && unfoldObj.strip) {
      const contour = unfoldObj.strip.getStripContour()
      const worldPos = screenToWorld(e.clientX, e.clientY)
      
      // Ограничиваем точку границами развертки
      const constrained = unfoldObj.strip.constrainPointToUnfoldBounds(worldPos)
      contour.setControlPoint(draggingPointIndex, constrained)
      unfoldObj.strip.setStripContour(contour)
      
      // Обновляем визуализацию в 3D сцене
      manager.updateStripContour(selectedMesh.value, contour)
      
      redrawOverlay()
    }
  }
}

function handleOverlayMouseDown(e) {
  if (!editingContour.value || !selectedMesh.value) return
  
  const unfoldObj = manager.getUnfoldObject(selectedMesh.value)
  if (!unfoldObj || !unfoldObj.strip) return
  
  const worldPos = screenToWorld(e.clientX, e.clientY)
  const contour = unfoldObj.strip.getStripContour()
  
  // Проверяем, попали ли на контрольную точку
  for (let i = 0; i < contour.getControlPointCount(); i++) {
    const cp = contour.getControlPoint(i)
    const screenPos = worldToScreen(cp.x, cp.y)
    
    const dx = e.clientX - screenPos.x
    const dy = e.clientY - screenPos.y
    
    if (Math.sqrt(dx * dx + dy * dy) < 10) {
      draggingPointIndex = i
      isDraggingOverlay = true
      redrawOverlay()
      return
    }
  }
}

function handleOverlayMouseUp(e) {
  isDraggingOverlay = false
  draggingPointIndex = -1
  redrawOverlay()
}

function handleOverlayMouseLeave(e) {
  isDraggingOverlay = false
  draggingPointIndex = -1
  redrawOverlay()
}
</script>

<template>
  <div ref="containerRef" class="unfold-viewport">
    <canvas ref="canvasOverlayRef" class="overlay-canvas" :style="{ pointerEvents: editingContour ? 'auto' : 'none' }"></canvas>
    <div class="overlay-info">
      <div>Проекция развертки (2D)</div>
      <button 
        @click="editingContour = !editingContour"
        :class="{ active: editingContour }"
        class="edit-button"
      >
        {{ editingContour ? 'Редактирование' : 'Просмотр' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.unfold-viewport { 
  width: 100%; 
  height: 100%; 
  background: #f0f0f0; 
  border-left: 2px solid #ddd;
  position: relative;
  overflow: hidden;
  cursor: crosshair;
}

.overlay-info {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
  font-size: 11px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 1px;
  z-index: 10;
}

.edit-button {
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 600;
  background: white;
  border: 1px solid #ccc;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-button:hover {
  border-color: #999;
  background: #f9f9f9;
}

.edit-button.active {
  background: #ff0000;
  color: white;
  border-color: #cc0000;
}

.overlay-canvas {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 5;
  cursor: crosshair;
}
</style>