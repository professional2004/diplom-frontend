import { CubeShape } from './CubeShape'
import { RoundedPrismShape } from './RoundedPrismShape'

export const ShapeRegistry = {
  cube: CubeShape,
  roundedPrism: RoundedPrismShape,

  create(type, params) {
    const ClassRef = this[type]
    if (!ClassRef) throw new Error(`Unknown shape type: ${type}`)
    return new ClassRef(params)
  }
}