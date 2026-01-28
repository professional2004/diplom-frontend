import { SurfaceRegistry } from '@/core/surfaces/SurfaceRegistry'
import { SurfaceStrip } from '@/core/surfaces/SurfaceStrip'

/**
 * Команда для добавления отреза поверхности на сцену
 * Теперь создает SurfaceStrip вместо простой поверхности
 */
export class AddSurfaceCommand {
  constructor(sceneSystem, surfaceType, params = {}) {
    this.sceneSystem = sceneSystem
    // Преобразуем тип поверхности в тип strip
    this.stripType = `${surfaceType}-strip`
    this.params = params
    this.mesh = null
  }

  execute() {
    if (!this.mesh) {
      // Создаем SurfaceStrip через реестр
      const stripInstance = SurfaceRegistry.create(this.stripType, this._getStripData())
      this.mesh = stripInstance.createMesh()

      // Сохраняем в userData тип strip для правильной идентификации
      this.mesh.userData.surfaceType = this.stripType
      this.mesh.userData.isStrip = true
      // Сохраняем полные данные strip
      this.mesh.userData.stripData = stripInstance.toJSON()

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

  /**
   * Подготовить данные для создания SurfaceStrip
   * @private
   */
  _getStripData() {
    // Если params уже полные данные strip - используем их
    if (this.params.type === 'strip') {
      return this.params
    }

    // Иначе создаем новый strip с дефолтными параметрами
    const baseSurfaceType = this.stripType.replace('-strip', '')
    const stripInstance = new SurfaceStrip(baseSurfaceType, this.params)
    return stripInstance.toJSON()
  }
}

