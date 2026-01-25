import * as THREE from 'three'
import { RendererController } from '@/core/controllers/RendererController'
import { CameraController } from '@/core/controllers/CameraController'
import { GridLayerController } from '@/core/controllers/GridLayerController'
import { InteractionController } from '@/core/controllers/InteractionController'
import { CommandManager } from '@/core/commands/CommandManager'

export class SceneManager {
  constructor(container) {
    if (!container) return

    this.container = container
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xe2e2e2)

    // Свет (нужен, если будем добавлять фигуры)
    const light = new THREE.DirectionalLight(0xffffff, 1)
    light.position.set(10, 10, 10)
    this.scene.add(light)
    this.scene.add(new THREE.AmbientLight(0x404040))

    // Основные системы
    this.renderer = new RendererController(container)
    this.camera = new CameraController(this.renderer.domElement)
    this.grid = new GridLayerController(this.scene)

    // Дополнительные системы (CAD-логика)
    this.interaction = new InteractionController(this.camera.camera, this.scene, this.renderer)
    this.commandManager = new CommandManager()

    // Наблюдатель за размером контейнера
    this.resizeObserver = new ResizeObserver(() => this.onContainerResize())
    this.resizeObserver.observe(this.container)

    // Анимация
    this.animate = this.animate.bind(this)
    this.animationFrame = requestAnimationFrame(this.animate)
  }

  onContainerResize() {
    if (!this.container || !this.camera || !this.renderer) return
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    this.camera.setAspect(width, height)
    this.renderer.setSize(width, height)
  }

  animate() {
    if (!this.renderer) return
    this.animationFrame = requestAnimationFrame(this.animate)
    this.camera.update()
    this.renderer.render(this.scene, this.camera.camera)
  }



  dispose() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame)
    this.resizeObserver.disconnect()

    this.interaction.dispose()
    this.grid.dispose()
    this.camera.dispose()
    this.renderer.dispose()
    
    this.scene.clear()
    this.scene = null
    this.container = null
  }
}