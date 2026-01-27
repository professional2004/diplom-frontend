import * as THREE from 'three'
import { TransformCommand } from './TransformCommand'

/**
 * Команда для масштабирования (изменения размера) фигуры
 * Поддерживает undo/redo
 */
export class ScaleShapeCommand extends TransformCommand {
  /**
   * @param {THREE.Object3D} mesh - 3D объект для масштабирования
   * @param {THREE.Vector3|Object} newScale - новый масштаб {x, y, z}
   * @param {THREE.Vector3|Object} oldScale - исходный масштаб
   */
  constructor(mesh, newScale, oldScale) {
    const newScl = this._ensureVector3(newScale)
    const oldScl = this._ensureVector3(oldScale)

    super(
      mesh,
      { scale: newScl },
      { scale: oldScl }
    )
  }

  /**
   * Убедиться, что значение - это THREE.Vector3
   */
  _ensureVector3(value) {
    if (!value) return null
    if (value.clone && typeof value.clone === 'function') {
      return value.clone()
    }
    // Если это простой объект {x, y, z}
    return new THREE.Vector3(value.x || 1, value.y || 1, value.z || 1)
  }
}
