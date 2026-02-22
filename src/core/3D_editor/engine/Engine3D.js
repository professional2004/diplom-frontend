import { SceneSystem3D } from '@/core/3D_editor/engine/systems/SceneSystem3D'
import { RenderSystem3D } from '@/core/3D_editor/engine/systems/RenderSystem3D'
import { CameraSystem3D } from '@/core/3D_editor/engine/systems/CameraSystem3D'
import { InputSystem3D } from '@/core/3D_editor/engine/systems/InputSystem3D'
import { SelectionSystem3D } from '@/core/3D_editor/engine/systems/SelectionSystem3D'
import { HistorySystem } from '@/core/general/engine/systems/HistorySystem'
import EngineRegistry from '@/core/general/engine/EngineRegistry'

export class Engine3D {
  constructor(container) {
    if (!container) throw new Error('[Engine.js] Engine requires container DOM element')

    this.renderSystem3D = new RenderSystem3D(container)
    this.sceneSystem3D = new SceneSystem3D()
    this.cameraSystem3D = new CameraSystem3D(container)
    this.inputSystem3D = new InputSystem3D(container)
    this.selectionSystem3D = new SelectionSystem3D()
    this.historySystem = new HistorySystem()

    // Связываем ресайз рендера с установкой aspect у камеры
    // (RenderSystem3D будет вызывать onResize при ResizeObserver)
    this.renderSystem3D.onResize = (w, h) => {
      try {
        this.cameraSystem3D.setAspect(w, h)
      } catch (e) {
        // безопасно поглощаем ошибки, чтобы не ломать цикл рендера
        console.warn('[Engine] camera setAspect failed on resize', e)
      }
    }

    this.inputSystem3D.setEngine(this)

    this.systems = [
      this.inputSystem3D,
      this.cameraSystem3D,
      this.selectionSystem3D, 
      this.renderSystem3D,
      this.historySystem
    ]

    this.running = true
    this.loop = this.loop.bind(this)
    requestAnimationFrame(this.loop)
    
    // регистрация в EngineRegistry
    EngineRegistry.registerEngine3D(this)
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
    this.sceneSystem3D.scene?.clear?.()
  }
}
