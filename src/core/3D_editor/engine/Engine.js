import { SceneSystem } from '@/core/3D_editor/engine/systems/SceneSystem'
import { RenderSystem } from '@/core/3D_editor/engine/systems/RenderSystem'
import { CameraSystem } from '@/core/3D_editor/engine/systems/CameraSystem'
import { InputSystem } from '@/core/3D_editor/engine/systems/InputSystem'
import { SelectionSystem } from '@/core/3D_editor/engine/systems/SelectionSystem'
import { HistorySystem } from '@/core/3D_editor/engine/systems/HistorySystem'

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
