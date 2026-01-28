import { PlanarSurface } from './PlanarSurface'
import { ConicalSurface } from './ConicalSurface'
import { CylindricalSurface } from './CylindricalSurface'

/**
 * Реестр для создания поверхностей по типам
 * Поддерживаемые типы: planar, conical, cylindrical
 */
export const SurfaceRegistry = {
  planar: PlanarSurface,
  conical: ConicalSurface,
  cylindrical: CylindricalSurface,

  create(type, params) {
    const ClassRef = this[type]
    if (!ClassRef) throw new Error(`Unknown surface type: ${type}`)
    return new ClassRef(params)
  }
}
