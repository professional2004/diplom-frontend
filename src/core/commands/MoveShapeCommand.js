import { TransformCommand } from './TransformCommand'

/**
 * Команда для перемещения фигуры (изменение позиции)
 * Теперь наследует базовый класс TransformCommand для унифицированного подхода
 * Поддерживает undo/redo
 */
export class MoveShapeCommand extends TransformCommand {
  /**
   * @param {THREE.Object3D} mesh - 3D объект для перемещения
   * @param {THREE.Vector3} newPosition - новая позиция
   * @param {THREE.Vector3} oldPosition - исходная позиция
   */
  constructor(mesh, newPosition, oldPosition) {
    super(
      mesh,
      { position: newPosition?.clone?.() || newPosition },
      { position: oldPosition?.clone?.() || oldPosition }
    )
  }
}