import { ConicalSurface } from './ConicalSurface'
import { CylindricalSurface } from './CylindricalSurface'

/**
 * Реестр для создания поверхностей по типам
 * Поддерживаемые типы:
 * - conical, cylindrical (старые типы, для совместимости)
 * - conical-strip, cylindrical-strip (новые типы с отрезами)
 * 
 * Старые типы автоматически оборачиваются в strip-ы
 */
export const SurfaceRegistry = {
  conical: ConicalSurface,
  cylindrical: CylindricalSurface,

  create(type, params) {
    // Для старых типов (conical, cylindrical)
    if (type === 'conical' || type === 'cylindrical') {
      const ClassRef = this[type]
      return new ClassRef(params)
    }

    throw new Error(`Unknown surface type: ${type}`)
  },

  /**
   * Создать SurfaceStrip определенного типа
   * Используется для создания отрезов с контурами
   */
  async createStrip(stripType, params = {}) {
    // Динамически импортируем SurfaceStrip чтобы избежать циклической зависимости
    const { SurfaceStrip } = await import('./SurfaceStrip')
    const baseSurfaceType = stripType.replace('-strip', '')
    return new SurfaceStrip(baseSurfaceType, params)
  }
}

