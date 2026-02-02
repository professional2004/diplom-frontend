<script setup>
import { ref, onMounted, watch } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { BezierCurve } from '@/core/curves/BezierCurve'
import * as THREE from 'three'

const props = defineProps({
  contour: BezierCurve,
  // Принимаем точки контура развертки (серый фон)
  unfoldOutlinePoints: { type: Array, default: () => [] },
  title: String
})

const store = useEditorStore()
const emit = defineEmits(['update:contour'])

const canvasRef = ref(null)
let ctx = null
const transform = ref({ scale: 40, offsetX: 0, offsetY: 0 })

// State
const selectedPointIndex = ref(-1)
const hoveredPointIndex = ref(-1)
const isDragging = ref(false)
const isPanning = ref(false)
const lastMouse = { x: 0, y: 0 }
const HIT_RADIUS = 8

// Кэш границ для ограничения перетаскивания
let boundsCache = null

onMounted(() => {
    if (!canvasRef.value) return
    ctx = canvasRef.value.getContext('2d')
    resize()
    centerView()
    updateBoundsCache() // Расчет границ
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
    updateBoundsCache()
    centerView()
    redraw()
}, { deep: true })

function updateBoundsCache() {
    if (props.unfoldOutlinePoints && props.unfoldOutlinePoints.length > 0) {
        boundsCache = new THREE.Box2().setFromPoints(props.unfoldOutlinePoints)
    } else {
        boundsCache = null
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
    
    if (boundsCache) {
        const center = new THREE.Vector2()
        boundsCache.getCenter(center)
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
    const step = transform.value.scale
    const ox = transform.value.offsetX % step
    const oy = transform.value.offsetY % step
    ctx.beginPath()
    for(let x=ox; x<w; x+=step) { ctx.moveTo(x,0); ctx.lineTo(x,h) }
    for(let y=oy; y<h; y+=step) { ctx.moveTo(0,y); ctx.lineTo(w,y) }
    ctx.stroke()
}

function drawContour() {
    if (!props.contour) return
    const pts = props.contour.getPoints(100)
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

// --- Interaction ---

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
        
        // --- Ограничение (Clamping) ---
        // Если есть границы развертки, не даем точке выйти за них
        if (boundsCache) {
            // Маленький отступ (epsilon) чтобы точка не залипла намертво на границе
            const eps = 0.001 
            w.x = Math.max(boundsCache.min.x, Math.min(boundsCache.max.x, w.x))
            w.y = Math.max(boundsCache.min.y, Math.min(boundsCache.max.y, w.y))
        }

        props.contour.setControlPoint(selectedPointIndex.value, new THREE.Vector2(w.x, w.y))
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
    
    // Также клампим при создании
    if (boundsCache) {
        w.x = Math.max(boundsCache.min.x, Math.min(boundsCache.max.x, w.x))
        w.y = Math.max(boundsCache.min.y, Math.min(boundsCache.max.y, w.y))
    }
    
    const idx = props.contour.insertControlPointAt(new THREE.Vector2(w.x, w.y))
    if (idx !== -1) {
        selectedPointIndex.value = idx
    } else {
        props.contour.addControlPoint(new THREE.Vector2(w.x, w.y))
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