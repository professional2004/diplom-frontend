import { CubeShape } from './shapes/CubeShape'
import { RoundedPrismShape } from './shapes/RoundedPrismShape'

export const ShapeRegistry = {
  cube: CubeShape,
  roundedPrism: RoundedPrismShape,

  create(type, params) {
    const ClassRef = this[type]
    if (!ClassRef) throw new Error(`Unknown shape type: ${type}`)
    return new ClassRef(params)
  }
}