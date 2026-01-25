import * as THREE from 'three'

export class RendererController {
  constructor(container, options = {}) {
    this.container = container
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: !!options.alpha })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(this.renderer.domElement)
  }

  setSize(width, height) {
    this.renderer.setSize(width, height)
  }

  render(scene, camera) {
    this.renderer.render(scene, camera)
  }

  get domElement() {
    return this.renderer.domElement
  }

  dispose() {
    try {
      this.renderer.dispose()
      // force context loss if available
      const gl = this.renderer.getContext && this.renderer.getContext()
      if (gl && gl.getExtension) {
        const ext = gl.getExtension('WEBGL_lose_context')
        if (ext) ext.loseContext()
      }
    } catch (e) {
      // ignore
    }
  }
}