import { SceneSystem2D } from './systems/SceneSystem2D'
import { CameraSystem2D } from './systems/CameraSystem2D'
import { RenderSystem2D } from './systems/RenderSystem2D'
import { InputSystem2D } from './systems/InputSystem2D'
import { SelectionSystem2D } from './systems/SelectionSystem2D'
import { SyncSystem2D } from './systems/SyncSystem2D'

export class Engine2D {
  constructor(container) {
    this.engine3D = null // Ссылка на главный движок
    
    this.sceneSystem = new SceneSystem2D()
    this.cameraSystem = new CameraSystem2D(container)
    this.renderSystem = new RenderSystem2D(container)
    this.inputSystem = new InputSystem2D(container)
    this.selectionSystem = new SelectionSystem2D()
    this.syncSystem = new SyncSystem2D(this)

    this.inputSystem.setEngine(this)
    
    this.renderSystem.onResize = (w, h) => {
      this.cameraSystem.setAspect(w, h)
      this.renderSystem.setSize(w, h)
    }

    this.systems = [
      this.cameraSystem,
      this.inputSystem,
      this.syncSystem, // Теперь проверка истории происходит в цикле
      this.renderSystem
    ]

    this.running = true
    this.loop = this.loop.bind(this)
    requestAnimationFrame(this.loop)
  }

  // Метод для внедрения 3D-движка
  set3DEngine(engine3D) {
    this.engine3D = engine3D
  }

  loop() {
    if (!this.running) return
    for (const system of this.systems) {
      if (typeof system.update === 'function') system.update(this)
    }
    requestAnimationFrame(this.loop)
  }

  dispose() {
    this.running = false
    this.sceneSystem.dispose()
    this.cameraSystem.dispose()
    this.renderSystem.dispose()
    this.inputSystem.dispose()
  }
}