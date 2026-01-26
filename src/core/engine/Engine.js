import { SceneSystem } from '@/core/engine/systems/SceneSystem.js'
import { RenderSystem } from '@/core/engine/systems/RenderSystem.js'
import { CameraSystem } from '@/core/engine/systems/CameraSystem.js'
import { InputSystem } from '@/core/engine/systems/InputSystem.js'
import { SelectionSystem } from '@/core/engine/systems/SelectionSystem.js'
import { HistorySystem } from '@/core/engine/systems/HistorySystem.js'

export class Engine {
  constructor(container) {
    if (!container) throw new Error('[Engine.js] Engine requires container DOM element')

    this.renderSystem = new RenderSystem(container)
    this.sceneSystem = new SceneSystem()
    this.cameraSystem = new CameraSystem(container)
    this.inputSystem = new InputSystem(container)
    this.selectionSystem = new SelectionSystem()
    this.historySystem = new HistorySystem()

    this.inputSystem.setEngine(this)

    this.systems = [
      this.inputSystem,
      this.cameraSystem,
      this.selectionSystem,
      this.historySystem, 
      this.renderSystem
    ]

    this.running = true
    this.loop = this.loop.bind(this)
    requestAnimationFrame(this.loop)
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
    this.systems.forEach(system => system.dispose?.())
    this.sceneSystem.scene?.clear?.()
  }
}
