import * as THREE from 'three'

export class RenderSystem {
  constructor(container, options = {}) {
    if (!container) throw new Error('[RenderSystem.js] container DOM element required')

    this.container = container
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: !!options.alpha })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(this.renderer.domElement)

    this.resizeObserver = new ResizeObserver(() => {
      this.setSize(container.clientWidth, container.clientHeight)
    })
    this.resizeObserver.observe(container)
  }

  setSize(w, h) {
    this.width = w
    this.height = h
    this.renderer.setSize(w, h)
  }

  get domElement() {
    return this.renderer.domElement
  }
  
  update(engine) {
    if (engine?.sceneSystem && engine?.cameraSystem) {
      this.renderer.render(engine.sceneSystem.scene, engine.cameraSystem.camera)
    }
  }

  render(scene, camera) {
    this.renderer.render(scene, camera)
  }

  dispose() {
    try {
      this.renderer.dispose()
      const gl = this.renderer.getContext && this.renderer.getContext()
      if (gl) {
        const ext = gl.getExtension && gl.getExtension('WEBGL_lose_context')
        if (ext) ext.loseContext()
      }
    } catch (e) {}
    this.resizeObserver.disconnect()
  }
}
