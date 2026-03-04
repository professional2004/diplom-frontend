import * as THREE from 'three'

export class RenderSystem3D {
  constructor(container, options = {}) {
    console.log('[->] RenderSystem3D: constructor')
    if (!container) throw new Error('[RenderSystem.js] container DOM element required')

    this.container = container
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: !!options.alpha })
    this.renderer.setPixelRatio(window.devicePixelRatio)

    // Установить canvas в потоковый режим, чтобы CSS контролировал размер контейнера,
    // но при этом мы будем передавать реальные размеры в setSize(..., false)
    const canvas = this.renderer.domElement
    canvas.style.display = 'block'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.position = 'absolute'
    canvas.style.top = '0'
    canvas.style.left = '0'

    this.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(this.renderer.domElement)

    // optional callback that engine3D can set: (w,h) => {}
    this.onResize = null

    this.resizeObserver = new ResizeObserver(() => {
      const w = this.container.clientWidth || 1
      const h = this.container.clientHeight || 1
      // обновляем рендерер
      this.setSize(w, h)
      // уведомляем слушателей (например, cameraSystem)
      if (typeof this.onResize === 'function') {
        this.onResize(w, h)
      }
    })
    this.resizeObserver.observe(container)
  }

  setSize(w, h) {
    console.log('[->] RenderSystem3D: setSize()')
    this.width = w
    this.height = h
    // третий аргумент false — запретить three.js переписывать inline width/height
    this.renderer.setSize(w, h, false)
  }

  get domElement() {
    console.log('[->] RenderSystem3D: get domElement()')
    return this.renderer.domElement
  }
  
  update(engine3D) {
    // console.log('[->] RenderSystem3D: update()')
    const { sceneSystem3D, cameraSystem3D, viewCubeGizmo } = engine3D

    if (!sceneSystem3D?.scene || !cameraSystem3D?.camera) return;
    
    // Рендерим основную сцену
    this.renderer.clear()
    this.renderer.render(sceneSystem3D.scene, cameraSystem3D.camera)
    
    // Рендерим Гизмо поверх
    if (viewCubeGizmo && typeof viewCubeGizmo.render === 'function') {
      // Выключаем авто-очистку, чтобы не стереть основную сцену
      this.renderer.autoClear = false
      viewCubeGizmo.render(this.renderer)
      this.renderer.autoClear = true
    }
  }

  render(scene, camera) {
    console.log('[->] RenderSystem3D: render()')
    this.renderer.render(scene, camera)
  }

  dispose() {
    console.log('[->] RenderSystem3D: dispose()')
    // detach canvas from DOM
    try {
      const canvas = this.renderer.domElement
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas)
    } catch (e) { console.warn('[RenderSystem3D] remove canvas failed', e) }
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