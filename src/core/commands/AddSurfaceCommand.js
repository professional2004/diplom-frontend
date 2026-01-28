import { SurfaceStrip } from '@/core/surfaces/SurfaceStrip'

/**
 * Команда для добавления отреза поверхности на сцену
 * Создает SurfaceStrip с дефолтными параметрами
 */
export class AddSurfaceCommand {
  constructor(sceneSystem, surfaceType, params = {}) {
    this.sceneSystem = sceneSystem
    this.baseSurfaceType = surfaceType  // 'cylindrical' или 'conical'
    this.params = params
    this.mesh = null
  }

  execute() {
    if (!this.mesh) {
      try {
        // Создаем SurfaceStrip напрямую
        const stripInstance = new SurfaceStrip(this.baseSurfaceType, this.params)
        this.mesh = stripInstance.createMesh()

        if (!this.mesh) {
          console.error('Failed to create mesh from strip')
          return
        }

        // Сохраняем в userData информацию о strip
        this.mesh.userData.surfaceType = this.baseSurfaceType
        this.mesh.userData.isStrip = true
        this.mesh.userData.stripData = stripInstance.toJSON()

        // Рандомная позиция для избежания наложения
        this.mesh.position.x = (Math.random() - 0.5) * 5
        this.mesh.position.z = (Math.random() - 0.5) * 5
      } catch (e) {
        console.error('AddSurfaceCommand.execute failed:', e)
        return
      }
    }
    this.sceneSystem.add(this.mesh)
  }

  undo() {
    if (this.mesh) {
      this.sceneSystem.remove(this.mesh)
    }
  }
}

