import * as THREE from 'three'

export class RenderSystem3D {
  constructor(engine, container) {
    this.engine = engine
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)

    // Создает canvas и монтируем его в container
    const canvas = this.renderer.domElement
    canvas.style = 'position: absolute; display: block; top: 0px; left: 0px; width: 100%; height: 100%;'
    container.appendChild(canvas)
    
    // Обновление размеров рендерера (с уведомлением других слушателей с помощью onResize)
    this.resizeObserver = new ResizeObserver((container) => {
      const w = container.clientWidth
      const h = container.clientHeight
      if (typeof this.onResize === 'function') {
        this.onResize(w, h)
      }
    })
    this.resizeObserver.observe(container)
  }

  update() {
    render()
  }

  render() {
    this.renderer.render(engine.sceneSystem3D.getScene(), engine.cameraSystem3D.getCamera())
  }

  setSize(w, h) {
    this.renderer.setSize(w, h, false)
  }

  dispose() {
    this.resizeObserver.disconnect()
    this.renderer.dispose()
    // Удаляем canvas из DOM, если он там есть
    const canvas = this.renderer.domElement
    if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas)
    }
  }
}