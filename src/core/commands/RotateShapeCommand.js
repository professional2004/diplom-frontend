import * as THREE from 'three'
import { TransformCommand } from './TransformCommand'

/**
 * Команда для поворота фигуры (rotation по осям X, Y, Z)
 * Поддерживает undo/redo
 */
export class RotateShapeCommand extends TransformCommand {
  /**
   * @param {THREE.Object3D} mesh - 3D объект для поворота
   * @param {THREE.Euler|Object} newRotation - новый угол поворота (как THREE.Euler или объект {x, y, z})
   * @param {THREE.Euler|Object} oldRotation - исходный угол поворота
   */
  constructor(mesh, newRotation, oldRotation) {
    // Преобразуем в THREE.Euler если нужно
    const newRot = this._ensureEuler(newRotation)
    const oldRot = this._ensureEuler(oldRotation)

    super(
      mesh,
      { rotation: newRot },
      { rotation: oldRot }
    )
  }

  /**
   * Убедиться, что значение - это THREE.Euler (или клон из объекта)
   */
  _ensureEuler(value) {
    if (!value) return null
    if (value.clone && typeof value.clone === 'function') {
      return value.clone()
    }
    // Если это простой объект {x, y, z}
    const euler = new THREE.Euler()
    if (value.x !== undefined) euler.x = value.x
    if (value.y !== undefined) euler.y = value.y
    if (value.z !== undefined) euler.z = value.z
    return euler
  }
}
