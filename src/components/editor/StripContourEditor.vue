<script setup>
import { ref, onMounted, watch } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { BezierCurve } from '@/core/curves/BezierCurve'
import * as THREE from 'three'

const props = defineProps({
  contour: BezierCurve,
  unfoldOutlinePoints: { type: Array, default: () => [] }, // "Серый" контур развертки
  title: String
})

const store = useEditorStore()
const emit = defineEmits(['update:contour'])

const canvasRef = ref(null)
let ctx = null
const transform = ref({ scale: 40, offsetX: 0, offsetY: 0 })

const selectedPointIndex = ref(-1)
const hoveredPointIndex = ref(-1)
const isDragging = ref(false)
const isPanning = ref(false)
const lastMouse = { x: 0, y: 0 }
const HIT_RADIUS = 8

// Кэш для быстрого ограничения
let polygonCache = []

onMounted(() => {
    if (!canvasRef.value) return
    ctx = canvasRef.value.getContext('2d')
    resize()
    updatePolygonCache()
    centerView()
    redraw()
    
    const cvs = canvasRef.value
    window.addEventListener('resize', () => { resize(); redraw() })
    cvs.addEventListener('mousedown', onMouseDown)
    cvs.addEventListener('mousemove', onMouseMove)
    cvs.addEventListener('mouseup', onMouseUp)
    cvs.addEventListener('wheel', onWheel, { passive: false })
    cvs.addEventListener('dblclick', onDblClick)
    cvs.addEventListener('contextmenu', onContextMenu)
    cvs.addEventListener('mouseleave', () => {
        isDragging.value = false
        isPanning.value = false
        redraw()
    })
})

watch(() => props.contour, redraw, { deep: true })
watch(() => props.unfoldOutlinePoints, () => {
    updatePolygonCache()
    centerView() // Центрируем только если изменилась развертка (новая поверхность)
    redraw()
}, { deep: true })

function updatePolygonCache() {
    if (props.unfoldOutlinePoints && props.unfoldOutlinePoints.length > 2) {
        // Просто копируем точки для использования в math
        polygonCache = props.unfoldOutlinePoints.map(p => new THREE.Vector2(p.x, p.y))
    } else {
        polygonCache = []
    }
}

function resize() {
    const p = canvasRef.value?.parentElement
    if (p && canvasRef.value) {
        canvasRef.value.width = p.clientWidth
        canvasRef.value.height = p.clientHeight
    }
}

function centerView() {
    if (!canvasRef.value) return
    const w = canvasRef.value.width, h = canvasRef.value.height
    
    if (polygonCache.length > 0) {
        const box = new THREE.Box2().setFromPoints(polygonCache)
        const center = new THREE.Vector2()
        box.getCenter(center)
        
        // Автозум, чтобы вся развертка влезла
        const bw = box.max.x - box.min.x
        const bh = box.max.y - box.min.y
        const padding = 50
        const scaleX = (w - padding*2) / bw
        const scaleY = (h - padding*2) / bh
        
        transform.value.scale = Math.min(Math.min(scaleX, scaleY), 100) // Не больше 100, чтоб не огромно
        
        transform.value.offsetX = w/2 - center.x * transform.value.scale
        transform.value.offsetY = h/2 + center.y * transform.value.scale
    } else {
        transform.value.offsetX = w/2
        transform.value.offsetY = h/2
    }
}

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
    if (!ctx || !canvasRef.value) return
    const w = canvasRef.value.width, h = canvasRef.value.height
    ctx.fillStyle = '#f9fafb'
    ctx.fillRect(0,0,w,h)
    
    drawGrid(w, h)
    drawRealOutline()
    
    if (props.contour) {
        drawContour()
        drawPoints()
    }
}

function drawRealOutline() {
    const pts = props.unfoldOutlinePoints
    if (!pts || pts.length < 2) return
    
    ctx.beginPath()
    pts.forEach((p, i) => {
        const s = toScreen(p.x, p.y)
        if (i===0) ctx.moveTo(s.x, s.y)
        else ctx.lineTo(s.x, s.y)
    })
    ctx.closePath()
    ctx.fillStyle = '#e5e7eb'
    ctx.fill()
    ctx.strokeStyle = '#9ca3af'
    ctx.setLineDash([5,5])
    ctx.stroke()
    ctx.setLineDash([])
}

function drawGrid(w, h) {
    ctx.strokeStyle = '#e0e0e0'
    ctx.lineWidth = 1
    const step = 50 // Фиксированный шаг сетки в пикселях для красоты, или transform.value.scale для точности
    // Давайте лучше динамическую
    const gridStep = transform.value.scale >= 20 ? transform.value.scale : transform.value.scale * 5
    
    const ox = transform.value.offsetX % gridStep
    const oy = transform.value.offsetY % gridStep
    
    ctx.beginPath()
    for(let x=ox; x<w; x+=gridStep) { ctx.moveTo(x,0); ctx.lineTo(x,h) }
    for(let y=oy; y<h; y+=gridStep) { ctx.moveTo(0,y); ctx.lineTo(w,y) }
    ctx.stroke()
}

function drawContour() {
    if (!props.contour) return
    const pts = props.contour.getPoints(150)
    ctx.beginPath()
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 2
    pts.forEach((p,i) => {
        const s = toScreen(p.x, p.y)
        if (i===0) ctx.moveTo(s.x, s.y)
        else ctx.lineTo(s.x, s.y)
    })
    ctx.closePath()
    ctx.fillStyle = 'rgba(239, 68, 68, 0.1)'
    ctx.fill()
    ctx.stroke()
}

function drawPoints() {
    if (!props.contour) return
    const count = props.contour.getControlPointCount()
    for(let i=0; i<count; i++) {
        const p = props.contour.getControlPoint(i)
        const s = toScreen(p.x, p.y)
        ctx.beginPath()
        ctx.arc(s.x, s.y, 5, 0, Math.PI*2)
        ctx.fillStyle = (i === selectedPointIndex.value) ? '#b91c1c' : '#ef4444'
        if (i===hoveredPointIndex.value) ctx.fillStyle = '#f87171'
        ctx.fill()
        ctx.stroke()
    }
}

function getPointAt(sx, sy) {
    if (!props.contour) return -1
    const c = props.contour.getControlPointCount()
    for(let i=0; i<c; i++) {
        const p = props.contour.getControlPoint(i)
        const s = toScreen(p.x, p.y)
        if ((s.x-sx)**2 + (s.y-sy)**2 < HIT_RADIUS**2) return i
    }
    return -1
}

// --- Математика ограничения (Clamping) ---

// 1. Проверка попадания точки в полигон (Ray Casting)
function isPointInPolygon(p, polygon) {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y
        const xj = polygon[j].x, yj = polygon[j].y
        
        const intersect = ((yi > p.y) !== (yj > p.y)) &&
            (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi)
        if (intersect) inside = !inside
    }
    return inside
}

// 2. Найти ближайшую точку НА ГРАНИЦЕ полигона
function getClosestPointOnPolygonOutline(p, polygon) {
    let minDistSq = Infinity
    let closest = new THREE.Vector2()
    
    // Проходим по всем ребрам
    for (let i = 0; i < polygon.length; i++) {
        const p1 = polygon[i]
        const p2 = polygon[(i + 1) % polygon.length] // Замыкаем на начало
        
        const proj = getClosestPointOnSegment(p, p1, p2)
        const dSq = p.distanceToSquared(proj)
        
        if (dSq < minDistSq) {
            minDistSq = dSq
            closest.copy(proj)
        }
    }
    return closest
}

// Проекция точки P на отрезок AB
function getClosestPointOnSegment(p, a, b) {
    const ab = new THREE.Vector2().subVectors(b, a)
    const ap = new THREE.Vector2().subVectors(p, a)
    
    const lenSq = ab.lengthSq()
    if (lenSq === 0) return a.clone() // Отрезок нулевой длины
    
    // Проекция (t от 0 до 1)
    let t = ap.dot(ab) / lenSq
    t = Math.max(0, Math.min(1, t))
    
    return new THREE.Vector2().addVectors(a, ab.multiplyScalar(t))
}

// Главная функция ограничения
function clampPointToPolygon(point, polygon) {
    if (!polygon || polygon.length < 3) return point
    
    // Если внутри - возвращаем как есть
    if (isPointInPolygon(point, polygon)) {
        return point
    }
    
    // Если снаружи - ищем ближайшую точку на границе
    return getClosestPointOnPolygonOutline(point, polygon)
}


// --- Обработчики ---

function onMouseDown(e) {
    const rect = canvasRef.value.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    
    if (e.button === 1 || e.altKey) {
        isPanning.value = true
        lastMouse.x = mx; lastMouse.y = my
        return
    }
    const idx = getPointAt(mx, my)
    if (idx !== -1) {
        selectedPointIndex.value = idx
        isDragging.value = true
    } else {
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
    
    if (isDragging.value && selectedPointIndex.value !== -1 && props.contour) {
        let w = toWorld(mx, my)
        let vecW = new THREE.Vector2(w.x, w.y)
        
        // [!] УМНОЕ ОГРАНИЧЕНИЕ
        if (polygonCache.length > 2) {
             vecW = clampPointToPolygon(vecW, polygonCache)
        }

        props.contour.setControlPoint(selectedPointIndex.value, vecW)
        emit('update:contour', props.contour)
        redraw()
    } else {
        const idx = getPointAt(mx, my)
        if (idx !== hoveredPointIndex.value) {
            hoveredPointIndex.value = idx
            redraw()
        }
    }
}

function onMouseUp() { isDragging.value = false; isPanning.value = false }

function onWheel(e) {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    transform.value.scale *= factor
    transform.value.scale = Math.max(5, Math.min(500, transform.value.scale))
    redraw()
}

function onDblClick(e) {
    if (!props.contour) return
    const rect = canvasRef.value.getBoundingClientRect()
    let w = toWorld(e.clientX - rect.left, e.clientY - rect.top)
    let vecW = new THREE.Vector2(w.x, w.y)
    
    // Клампим при создании
    if (polygonCache.length > 2) {
        vecW = clampPointToPolygon(vecW, polygonCache)
    }
    
    const idx = props.contour.insertControlPointAt(vecW)
    if (idx !== -1) {
        selectedPointIndex.value = idx
    } else {
        props.contour.addControlPoint(vecW)
        selectedPointIndex.value = props.contour.getControlPointCount() - 1
    }
    emit('update:contour', props.contour)
    redraw()
}

function onContextMenu(e) {
    if (!props.contour) return
    e.preventDefault()
    const rect = canvasRef.value.getBoundingClientRect()
    const idx = getPointAt(e.clientX - rect.left, e.clientY - rect.top)
    if (idx !== -1) {
        props.contour.removeControlPoint(idx)
        emit('update:contour', props.contour)
        redraw()
    }
}
</script>

<template>
  <div class="strip-editor">
     <div class="head">
       {{ title }} 
       <span class="tip">DblClick: Add | R-Click: Del | Alt+Drag: Pan</span>
     </div>
     <canvas ref="canvasRef"></canvas>
  </div>
</template>

<style scoped>
.strip-editor { width:100%; height:100%; display:flex; flex-direction:column; background:white;}
.head { padding:8px; border-bottom:1px solid #eee; font-weight:600; font-size:13px; display:flex; justify-content:space-between; align-items: center;}
.tip { color:#999; font-weight:normal; font-size:11px;}
canvas { flex:1; cursor:crosshair; display:block;}
</style>