import { ConicalSurface } from './ConicalSurface'
import { CylindricalSurface } from './CylindricalSurface'

/**
 * Реестр для создания поверхностей по типам
 * Поддерживаемые типы: conical, cylindrical
 */
export const SurfaceRegistry = {
  conical: ConicalSurface,
  cylindrical: CylindricalSurface,

  create(type, params) {
    const ClassRef = this[type]
    if (!ClassRef) throw new Error(`Unknown surface type: ${type}`)
    return new ClassRef(params)
  }
}
