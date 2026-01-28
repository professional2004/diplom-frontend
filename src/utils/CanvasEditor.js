/**
 * Базовый класс для работы с редакторами на основе Canvas
 * Инкапсулирует всю логику управления canvas, масштабирования, панорамирования, координат
 */
export class CanvasEditor {
  constructor(canvas, options = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.pointRadius = options.pointRadius || 8
    
    // Состояние визуализации
    this.scale = options.initialScale || 100        // pixels per unit
    this.panX = 0                                     // pan offset X
    this.panY = 0                                     // pan offset Y
    this.hoveredPointIndex = -1
    
    // Состояние взаимодействия
    this.isDragging = false
    this.isPanning = false
    this.selectedPointIndex = -1
    this.lastPanX = 0
    this.lastPanY = 0
    
    // Цвета
    this.colors = {
      background: '#ffffff',
      grid: '#e5e7eb',
      axis: '#6b7280',
      controlLine: '#999',
      curve: '#2563eb',
      point: '#374151',
      selectedPoint: '#dc2626',
      hoveredPoint: '#f59e0b',
      ...options.colors
    }
    
    this.setupEventListeners()
  }
  
  setupEventListeners() {
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this))
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this))
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this))
    this.canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this))
    this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false })
  }
  
  // Преобразования координат
  screenToWorld(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect()
    const x = screenX - rect.left
    const y = screenY - rect.top
    
    const width = this.canvas.width
    const height = this.canvas.height
    const centerX = width / 2 + this.panX
    const centerY = height / 2 + this.panY
    
    return {
      x: (x - centerX) / this.scale,
      y: -(y - centerY) / this.scale
    }
  }
  
  worldToScreen(x, y) {
    const width = this.canvas.width
    const height = this.canvas.height
    const centerX = width / 2 + this.panX
    const centerY = height / 2 + this.panY
    
    const rect = this.canvas.getBoundingClientRect()
    
    return {
      x: rect.left + centerX + x * this.scale,
      y: rect.top + centerY - y * this.scale
    }
  }
  
  // Сетка и оси
  drawGrid() {
    this.ctx.strokeStyle = this.colors.grid
    this.ctx.lineWidth = 1
    
    const width = this.canvas.width
    const height = this.canvas.height
    const centerX = width / 2 + this.panX
    const centerY = height / 2 + this.panY
    
    // Вертикальная сетка
    for (let i = -5; i <= 5; i++) {
      const x = centerX + i * this.scale
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, height)
      this.ctx.stroke()
    }
    
    // Горизонтальная сетка
    for (let i = -5; i <= 5; i++) {
      const y = centerY + i * this.scale
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(width, y)
      this.ctx.stroke()
    }
    
    // Оси координат
    this.ctx.strokeStyle = this.colors.axis
    this.ctx.lineWidth = 2
    this.ctx.beginPath()
    this.ctx.moveTo(centerX, 0)
    this.ctx.lineTo(centerX, height)
    this.ctx.stroke()
    
    this.ctx.beginPath()
    this.ctx.moveTo(0, centerY)
    this.ctx.lineTo(width, centerY)
    this.ctx.stroke()
  }
  
  // Обработчики событий (переопределяются в подклассах)
  onMouseMove(e) {
    if (this.isPanning) {
      const deltaX = e.clientX - this.lastPanX
      const deltaY = e.clientY - this.lastPanY
      this.panX += deltaX
      this.panY += deltaY
      this.lastPanX = e.clientX
      this.lastPanY = e.clientY
      this.redraw()
    }
  }
  
  onMouseDown(e) {
    if (e.button === 1) {
      e.preventDefault()
      this.isPanning = true
      this.lastPanX = e.clientX
      this.lastPanY = e.clientY
    }
  }
  
  onMouseUp(e) {
    if (e.button === 1) {
      this.isPanning = false
    }
  }
  
  onMouseLeave() {
    this.hoveredPointIndex = -1
    this.isDragging = false
    this.isPanning = false
    this.redraw()
  }
  
  onWheel(e) {
    e.preventDefault()
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    const oldScale = this.scale
    this.scale *= zoomFactor
    
    // Ограничиваем масштаб
    this.scale = Math.max(20, Math.min(this.scale, 500))
    
    // Зумируем относительно центра
    const scaleDiff = this.scale - oldScale
    this.panX -= scaleDiff * 0.1
    this.panY -= scaleDiff * 0.1
    
    this.redraw()
  }
  
  // Метод для переопределения в подклассах
  redraw() {
    this.ctx.fillStyle = this.colors.background
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    this.drawGrid()
  }
  
  clear() {
    this.panX = 0
    this.panY = 0
    this.scale = 100
    this.selectedPointIndex = -1
    this.hoveredPointIndex = -1
  }
}
