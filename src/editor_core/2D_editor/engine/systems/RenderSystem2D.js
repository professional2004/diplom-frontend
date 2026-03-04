import * as THREE from 'three'

export class RenderSystem2D {
  constructor(container) {
    console.log('[->] RenderSystem2D: container')
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    
    // Жестко фиксируем стили канваса, чтобы он не "распирал" родителя
    const canvas = this.renderer.domElement
    canvas.style.position = 'absolute'
    canvas.style.top = '0'
    canvas.style.left = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    
    container.appendChild(canvas)

    // ИСПРАВЛЕНИЕ: Защита от нулевых размеров при инициализации
    const w = container.clientWidth || 1
    const h = container.clientHeight || 1
    
    // Третий аргумент false запрещает Three.js переписывать inline-стили width/height
    this.renderer.setSize(w, h, false)
    this.renderer.setPixelRatio(window.devicePixelRatio)

    this.resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const width = entry.contentRect.width || 1
        const height = entry.contentRect.height || 1
        if(this.onResize) this.onResize(width, height)
      }
    })
    this.resizeObserver.observe(container)
  }

  update(engine2D) {
    // console.log('[->] RenderSystem2D: update()')
    if (engine2D?.sceneSystem2D?.scene && engine2D?.cameraSystem2D?.camera) {
      this.renderer.render(engine2D.sceneSystem2D.scene, engine2D.cameraSystem2D.camera)
    }
  }

  setSize(w, h) {
    console.log('[->] RenderSystem2D: setSize()')
    // Не забываем передать false и сюда
    this.renderer.setSize(w, h, false)
  }

  dispose() {
    console.log('[->] RenderSystem2D: dispose()')
    this.resizeObserver.disconnect()
    // remove canvas from DOM to avoid detached elements
    try {
      const canvas = this.renderer.domElement
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas)
    } catch (e) { console.warn('[RenderSystem2D] remove canvas failed', e) }
    this.renderer.dispose()
  }
}