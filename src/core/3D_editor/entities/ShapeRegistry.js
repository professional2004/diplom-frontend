import { CubeShape } from './shapes/CubeShape'
import { RoundedPrismShape } from './shapes/RoundedPrismShape'
import { ConicalSurfaceShape } from './shapes/ConicalSurfaceShape'
import { CylindricalSurfaceShape } from './shapes/CylindricalSurfaceShape'
import { FlatSurfaceShape } from './shapes/FlatSurfaceShape'

export const ShapeRegistry = {
  cube: CubeShape,
  roundedPrism: RoundedPrismShape,
  conical: ConicalSurfaceShape,
  cylindrical: CylindricalSurfaceShape,
  flat: FlatSurfaceShape,

  create(type, params) {
    const ClassRef = this[type]
    if (!ClassRef) throw new Error(`Unknown shape type: ${type}`)
    return new ClassRef(params)
  }
}