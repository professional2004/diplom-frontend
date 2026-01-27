import * as THREE from 'three'

/**
 * Базовый класс для всех команд трансформирования объектов
 * Обеспечивает единый интерфейс для позиции, поворота и масштаба
 * Принцип DRY - все команды трансформирования наследуют эту логику
 */
export class TransformCommand {
  /**
   * @param {THREE.Object3D} mesh - 3D объект для трансформирования
   * @param {Object} transformData - объект с новыми значениями {position, rotation, scale}
   * @param {Object} originalData - объект с исходными значениями {position, rotation, scale}
   */
  constructor(mesh, transformData = {}, originalData = {}) {
    this.mesh = mesh
    
    // Сохраняем оригинальные значения, клонируя, чтобы избежать изменений по ссылке
    this.originalData = this._cloneTransformData(originalData)
    
    // Сохраняем новые значения
    this.transformData = this._cloneTransformData(transformData)
  }

  /**
   * Клонирует данные трансформирования
   */
  _cloneTransformData(data) {
    return {
      position: data.position?.clone?.() || null,
      rotation: data.rotation?.clone?.() || null,
      scale: data.scale?.clone?.() || null,
    }
  }

  /**
   * Применяет трансформирование к объекту
   */
  _applyTransform(data) {
    if (!this.mesh || !data) return
    
    if (data.position) this.mesh.position.copy(data.position)
    if (data.rotation) this.mesh.rotation.copy(data.rotation)
    if (data.scale) this.mesh.scale.copy(data.scale)
  }

  /**
   * Выполняет команду (применяет новые значения)
   */
  execute() {
    this._applyTransform(this.transformData)
  }

  /**
   * Отменяет команду (восстанавливает оригинальные значения)
   */
  undo() {
    this._applyTransform(this.originalData)
  }

  /**
   * Вспомогательный метод для получения текущего состояния объекта
   */
  static captureTransform(mesh) {
    if (!mesh) return {}
    return {
      position: mesh.position.clone(),
      rotation: mesh.rotation.clone(),
      scale: mesh.scale.clone(),
    }
  }
}
