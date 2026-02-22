import { SceneSystem2D } from './systems/SceneSystem2D'
import { CameraSystem2D } from './systems/CameraSystem2D'
import { RenderSystem2D } from './systems/RenderSystem2D'
import { InputSystem2D } from './systems/InputSystem2D'
import { SelectionSystem2D } from './systems/SelectionSystem2D'

export class Engine2D {
  constructor(container, registry) {
    this.registry = registry
    this.engine3D = null
    
    this.sceneSystem2D = new SceneSystem2D()
    this.cameraSystem2D = new CameraSystem2D(container)
    this.renderSystem2D = new RenderSystem2D(container)
    this.inputSystem2D = new InputSystem2D(container)
    this.selectionSystem2D = new SelectionSystem2D()

    this.inputSystem2D.setEngine(this)
    
    this.renderSystem2D.onResize = (w, h) => {
      this.cameraSystem2D.setAspect(w, h)
      this.renderSystem2D.setSize(w, h)
    }

    this.systems = [
      this.cameraSystem2D,
      this.inputSystem2D,
      this.renderSystem2D
    ]

    this.running = true
    this.loop = this.loop.bind(this)
    requestAnimationFrame(this.loop)
  }


  set3DEngine(engine3D) {
    this.engine3D = engine3D
    try {
      if (engine3D?.sceneSystem3D?.grid) {
        this.sceneSystem2D.matchGridFrom(engine3D.sceneSystem3D.grid)
      }
    } catch (e) { console.warn('[Engine2D] matchGridFrom failed', e) }
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
    this.sceneSystem2D.dispose()
    this.cameraSystem2D.dispose()
    this.renderSystem2D.dispose()
    this.inputSystem2D.dispose()
  }
}