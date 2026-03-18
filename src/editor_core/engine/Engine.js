// 2D системы
import { CameraSystem2D } from '@/editor_core/engine/scene2D/CameraSystem2D'
import { InteractionSystem2D } from '@/editor_core/engine/scene2D/InteractionSystem2D'
import { RenderSystem2D } from '@/editor_core/engine/scene2D/RenderSystem2D'
import { SceneSystem2D } from '@/editor_core/engine/scene2D/SceneSystem2D'
// 3D системы
import { CameraSystem3D } from '@/editor_core/engine/scene3D/CameraSystem3D'
import { InteractionSystem3D } from '@/editor_core/engine/scene3D/InteractionSystem3D'
import { RenderSystem3D } from '@/editor_core/engine/scene3D/RenderSystem3D'
import { SceneSystem3D } from '@/editor_core/engine/scene3D/SceneSystem3D'

export class Engine {
  constructor(container2D, container3D) {
    this.container2D = container2D
    this.container3D = container3D

    // Инициализация систем 2D
    this.cameraSystem2D = new CameraSystem2D(container2D)
    this.interactionSystem2D = new InteractionSystem2D(this, container2D)
    this.renderSystem2D = new RenderSystem2D(this, container2D)
    this.sceneSystem2D = new SceneSystem2D()

    this.renderSystem2D.onResize = (w, h) => {
      this.cameraSystem2D.setAspect(w, h)
      this.renderSystem2D.setSize(w, h)
    }

    this.systems2D = [
      this.cameraSystem2D,
      this.interactionSystem2D,
      this.renderSystem2D, 
      this.sceneSystem2D
    ]

    // Инициализация систем 3D
    this.cameraSystem3D = new CameraSystem3D(container3D)
    this.interactionSystem3D = new InteractionSystem3D(this, container3D)
    this.renderSystem3D = new RenderSystem3D(this, container3D)
    this.sceneSystem3D = new SceneSystem3D()

    this.renderSystem3D.onResize = (w, h) => {
      this.cameraSystem3D.setAspect(w, h)
      this.renderSystem3D.setSize(w, h)
    }

    this.systems3D = [
      this.cameraSystem3D,
      this.interactionSystem3D,
      this.renderSystem3D, 
      this.sceneSystem3D
    ]

    // Итоговая инициализация и задание состояния движка
    this.systems = [
      this.systems2D,
      this.systems3D
    ]

    this.running = true
    this.loop = this.loop.bind(this)
    requestAnimationFrame(this.loop)

  }

  loop() {
    if (!this.running) return
    for (const systemList of this.systems) {
      for (const system of systemList) {
        if (typeof system.update === 'function') system.update(this)
      }
    }
    requestAnimationFrame(this.loop)
  }

  dispose() {
    this.running = false
    for (const systemList of this.systems) {
      for (const system of systemList) {
        system.dispose?.()
      }
    }
  }
}
