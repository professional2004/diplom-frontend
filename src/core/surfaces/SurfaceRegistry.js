import { ConicalSurface } from './ConicalSurface'
import { CylindricalSurface } from './CylindricalSurface'
import { SurfaceStrip } from './SurfaceStrip'

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
  'conical-strip': SurfaceStrip,
  'cylindrical-strip': SurfaceStrip,

  create(type, params) {
    // Для strip типов передаём параметры специальным образом
    if (type === 'conical-strip' || type === 'cylindrical-strip') {
      // Если это JSON с типом strip, восстанавливаем из JSON
      if (params && params.type === 'strip') {
        return SurfaceStrip.fromJSON(params)
      }
      // Иначе это новый strip - создаем с дефолтными параметрами
      return SurfaceRegistry.createStrip(type, params)
    }

    // Для старых типов (conical, cylindrical)
    if (type === 'conical' || type === 'cylindrical') {
      // Если params это JSON старого формата - создаем поверхность и оборачиваем
      const baseSurface = new (this[type])(params)
      // Возвращаем базовую поверхность, а не strip
      // (для совместимости с уже загруженными данными)
      return baseSurface
    }

    const ClassRef = this[type]
    if (!ClassRef) throw new Error(`Unknown surface type: ${type}`)
    return new ClassRef(params)
  },

  /**
   * Создать SurfaceStrip определенного типа
   */
  createStrip(stripType, params = {}) {
    const baseSurfaceType = stripType.replace('-strip', '')
    return new SurfaceStrip(baseSurfaceType, params)
  }
}


