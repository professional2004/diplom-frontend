import { SurfaceRegistry } from '@/core/surfaces/SurfaceRegistry'

/**
 * Команда для добавления поверхности на сцену
 */
export class AddSurfaceCommand {
  constructor(sceneSystem, surfaceType, params = {}) {
    this.sceneSystem = sceneSystem
    this.surfaceType = surfaceType
    this.params = params
    this.mesh = null
  }

  execute() {
    if (!this.mesh) {
      // Создаем поверхность через реестр
      const surfaceInstance = SurfaceRegistry.create(this.surfaceType, this.params)
      this.mesh = surfaceInstance.createMesh()

      // Рандомная позиция для избежания наложения
      this.mesh.position.x = (Math.random() - 0.5) * 5
      this.mesh.position.z = (Math.random() - 0.5) * 5
    }
    this.sceneSystem.add(this.mesh)
  }

  undo() {
    if (this.mesh) {
      this.sceneSystem.remove(this.mesh)
    }
  }
}
