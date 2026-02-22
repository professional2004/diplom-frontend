import * as THREE from 'three'

export class RenderSystem2D {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    
    // ИСПРАВЛЕНИЕ: Жестко фиксируем стили канваса, чтобы он не "распирал" родителя
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

  update(engine) {
    if (engine?.sceneSystem?.scene && engine?.cameraSystem?.camera) {
      this.renderer.render(engine.sceneSystem.scene, engine.cameraSystem.camera)
    }
  }

  setSize(w, h) {
    // Не забываем передать false и сюда
    this.renderer.setSize(w, h, false)
  }

  dispose() {
    this.resizeObserver.disconnect()
    this.renderer.dispose()
  }
}