<script setup>
import { ref, onMounted, watch } from 'vue'
import { BezierCurve } from '@/core/curves/BezierCurve'
import * as THREE from 'three'

const props = defineProps({
  curve: BezierCurve,
  title: String
})

const emit = defineEmits(['update:curve'])
const canvasRef = ref(null)

// State
const selectedPointIndex = ref(-1)
const hoveredPointIndex = ref(-1)
const isDragging = ref(false)
const isPanning = ref(false)
const lastMouse = { x: 0, y: 0 }

// Viewport
const transform = ref({ scale: 40, offsetX: 0, offsetY: 0 })
let ctx = null
const POINT_RADIUS = 6

onMounted(() => {
  if (!canvasRef.value) return
  ctx = canvasRef.value.getContext('2d')
  resize()
  centerView()
  redraw()
  
  const el = canvasRef.value
  window.addEventListener('resize', () => { resize(); redraw() })
  
  // Мышь
  el.addEventListener('mousedown', onMouseDown)
  el.addEventListener('mousemove', onMouseMove)
  el.addEventListener('mouseup', onMouseUp)
  el.addEventListener('wheel', onWheel, { passive: false })
  el.addEventListener('dblclick', onDblClick)
  el.addEventListener('contextmenu', onContextMenu)
  el.addEventListener('mouseleave', () => {
      isDragging.value = false; isPanning.value = false; redraw()
  })
})

watch(() => props.curve, redraw, { deep: true })

function resize() {
  const rect = canvasRef.value.parentElement.getBoundingClientRect()
  canvasRef.value.width = rect.width
  canvasRef.value.height = rect.height
}

function centerView() {
    const w = canvasRef.value.width, h = canvasRef.value.height
    transform.value.offsetX = w/2
    transform.value.offsetY = h/2
}

// Координаты: World (0,0) -> Screen (Center)
// Y World вверх -> Y Screen вниз
function toScreen(x, y) {
    return {
        x: transform.value.offsetX + x * transform.value.scale,
        y: transform.value.offsetY - y * transform.value.scale
    }
}
function toWorld(sx, sy) {
    return {
        x: (sx - transform.value.offsetX) / transform.value.scale,
        y: -(sy - transform.value.offsetY) / transform.value.scale
    }
}

function redraw() {
    if (!ctx) return
    const w = canvasRef.value.width, h = canvasRef.value.height
    
    // Фон
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0,0,w,h)
    
    drawGrid(w, h)
    
    if (props.curve) {
        drawCurve()
        drawPoints()
    }
}

function drawGrid(w, h) {
    ctx.strokeStyle = '#f0f0f0'
    ctx.lineWidth = 1
    const step = transform.value.scale
    const offX = transform.value.offsetX % step
    const offY = transform.value.offsetY % step
    
    ctx.beginPath()
    for(let x=offX; x<w; x+=step) { ctx.moveTo(x,0); ctx.lineTo(x,h) }
    for(let y=offY; y<h; y+=step) { ctx.moveTo(0,y); ctx.lineTo(w,y) }
    ctx.stroke()
    
    // Оси
    const center = toScreen(0,0)
    ctx.strokeStyle = '#ddd'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, center.y); ctx.lineTo(w, center.y)
    ctx.moveTo(center.x, 0); ctx.lineTo(center.x, h)
    ctx.stroke()
}

function drawCurve() {
    const points = props.curve.getPoints(100)
    ctx.beginPath()
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 2
    points.forEach((p, i) => {
        const s = toScreen(p.x, p.y)
        if (i===0) ctx.moveTo(s.x, s.y)
        else ctx.lineTo(s.x, s.y)
    })
    if (props.curve.closed && points.length) {
        const s = toScreen(points[0].x, points[0].y)
        ctx.lineTo(s.x, s.y)
    }
    ctx.stroke()
}

function drawPoints() {
    const count = props.curve.getControlPointCount()
    for(let i=0; i<count; i++) {
        const p = props.curve.getControlPoint(i)
        const s = toScreen(p.x, p.y)
        
        ctx.beginPath()
        ctx.arc(s.x, s.y, POINT_RADIUS, 0, Math.PI*2)
        ctx.fillStyle = (i === selectedPointIndex.value) ? '#dc2626' : '#374151'
        if (i === hoveredPointIndex.value) ctx.fillStyle = '#f59e0b'
        
        ctx.fill()
        ctx.stroke()
        
        // Index
        ctx.fillStyle = 'white'
        ctx.font = '9px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(i, s.x, s.y)
    }
}

function getPointIndexAt(sx, sy) {
    if (!props.curve) return -1
    const count = props.curve.getControlPointCount()
    for(let i=0; i<count; i++) {
        const p = props.curve.getControlPoint(i)
        const s = toScreen(p.x, p.y)
        const dx = s.x - sx, dy = s.y - sy
        if (dx*dx + dy*dy < 100) return i
    }
    return -1
}

// --- События ---

function onMouseDown(e) {
    const rect = canvasRef.value.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    
    if (e.button === 1 || e.altKey) {
        isPanning.value = true
        lastMouse.x = mx; lastMouse.y = my
        return
    }
    
    const idx = getPointIndexAt(mx, my)
    if (idx !== -1) {
        selectedPointIndex.value = idx
        isDragging.value = true
    } else {
        // Drag background to pan
        isPanning.value = true
        lastMouse.x = mx; lastMouse.y = my
    }
}

function onMouseMove(e) {
    const rect = canvasRef.value.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    
    if (isPanning.value) {
        transform.value.offsetX += mx - lastMouse.x
        transform.value.offsetY += my - lastMouse.y
        lastMouse.x = mx; lastMouse.y = my
        redraw()
        return
    }
    
    if (isDragging.value && selectedPointIndex.value !== -1) {
        const w = toWorld(mx, my)
        props.curve.setControlPoint(selectedPointIndex.value, new THREE.Vector2(w.x, w.y))
        emit('update:curve', props.curve)
        redraw()
    } else {
        const idx = getPointIndexAt(mx, my)
        if (idx !== hoveredPointIndex.value) {
            hoveredPointIndex.value = idx
            redraw()
        }
    }
}

function onMouseUp() {
    isDragging.value = false
    isPanning.value = false
}

function onWheel(e) {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    transform.value.scale *= factor
    redraw()
}

// Добавление точки
function onDblClick(e) {
    const rect = canvasRef.value.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    const w = toWorld(mx, my)
    
    // Пытаемся вставить точку в сегмент
    const idx = props.curve.insertControlPointAt(new THREE.Vector2(w.x, w.y))
    if (idx !== -1) {
        selectedPointIndex.value = idx
        emit('update:curve', props.curve)
        redraw()
    } else {
        // Если далеко от линий - просто добавляем в конец
        props.curve.addControlPoint(new THREE.Vector2(w.x, w.y))
        selectedPointIndex.value = props.curve.getControlPointCount() - 1
        emit('update:curve', props.curve)
        redraw()
    }
}

// Удаление точки
function onContextMenu(e) {
    e.preventDefault()
    const rect = canvasRef.value.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    
    const idx = getPointIndexAt(mx, my)
    if (idx !== -1) {
        props.curve.removeControlPoint(idx)
        selectedPointIndex.value = -1
        emit('update:curve', props.curve)
        redraw()
    }
}
</script>

<template>
  <div class="curve-editor">
    <div class="editor-header">
       <h3>{{ title }}</h3>
       <div class="help">DblClick: Add Point | R-Click: Del Point | Alt+Drag: Pan</div>
    </div>
    <div class="canvas-container">
       <canvas ref="canvasRef"></canvas>
    </div>
  </div>
</template>

<style scoped>
.curve-editor { height: 100%; display:flex; flex-direction:column; background:white; }
.editor-header { padding: 8px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center; }
.help { font-size:11px; color:#888; }
.canvas-container { flex:1; overflow:hidden; }
canvas { width:100%; height:100%; display:block; cursor:crosshair; }
</style>