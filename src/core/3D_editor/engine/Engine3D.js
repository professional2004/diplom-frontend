import { SceneSystem3D } from '@/core/3D_editor/engine/systems/SceneSystem3D'
import { RenderSystem3D } from '@/core/3D_editor/engine/systems/RenderSystem3D'
import { CameraSystem3D } from '@/core/3D_editor/engine/systems/CameraSystem3D'
import { InputSystem3D } from '@/core/3D_editor/engine/systems/InputSystem3D'
import { SelectionSystem3D } from '@/core/3D_editor/engine/systems/SelectionSystem3D'
import { ViewCubeGizmo } from '@/core/3D_editor/utils/ViewCubeGizmo'

export class Engine3D {
  constructor(container, registry) {
    if (!container) throw new Error('[Engine.js] Engine requires container DOM element')
    
    this.registry = registry

    this.renderSystem3D = new RenderSystem3D(container)
    this.sceneSystem3D = new SceneSystem3D()
    this.cameraSystem3D = new CameraSystem3D(container)
    this.inputSystem3D = new InputSystem3D(container)
    this.selectionSystem3D = new SelectionSystem3D()

    this.renderSystem3D.onResize = (w, h) => {
      try { this.cameraSystem3D.setAspect(w, h) } catch (e) { console.warn(e) }
    }

    this.inputSystem3D.setEngine(this)

    this.viewCubeGizmo = new ViewCubeGizmo(
      this.cameraSystem3D.camera, 
      this.renderSystem3D.renderer,
      this.cameraSystem3D.controls // чтобы Гизмо мог вращать камеру
    )

    this.systems = [
      this.inputSystem3D,
      this.cameraSystem3D,
      this.selectionSystem3D, 
      this.viewCubeGizmo,
      this.renderSystem3D
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
    this.sceneSystem3D.scene?.clear?.()
  }
}
