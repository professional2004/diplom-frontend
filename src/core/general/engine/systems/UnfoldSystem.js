/**
 * UnfoldSystem - централизованное управление всеми развертками
 * Аналогично ShapeSystem для 3D фигур
 */
export class UnfoldSystem {
  constructor() {
    // Map: unfoldId -> unfoldDetail (объект с mesh и metadata)
    this.entities = new Map()
    this.nextId = 1
  }

  /**
   * Добавляет новую развертку в систему
   * @param {UnfoldDetail} unfoldDetail - объект развертки
   * @returns {string} ID развертки
   */
  add(unfoldDetail) {
    const id = `unfold-${this.nextId++}`
    unfoldDetail.mesh.userData.unfoldId = id
    this.entities.set(id, unfoldDetail)
    return id
  }

  /**
   * Получает развертку по ID
   * @param {string} id - ID развертки
   * @returns {UnfoldDetail|null}
   */
  getById(id) {
    return this.entities.get(id) || null
  }

  /**
   * Получает развертку по объекту mesh
   * @param {THREE.Object3D} mesh
   * @returns {UnfoldDetail|null}
   */
  getByMesh(mesh) {
    for (const unfold of this.entities.values()) {
      if (unfold.mesh === mesh) return unfold
    }
    return null
  }

  /**
   * Получает все развертки для конкретной 3D фигуры
   * @param {string} parentShapeId - UUID 3D фигуры
   * @returns {UnfoldDetail[]}
   */
  getByParentShapeId(parentShapeId) {
    const result = []
    for (const unfold of this.entities.values()) {
      if (unfold.mesh.userData.parentShapeId === parentShapeId) {
        result.push(unfold)
      }
    }
    return result
  }

  /**
   * Удаляет развертку из системы
   * @param {string} id - ID развертки
   */
  remove(id) {
    this.entities.delete(id)
  }

  /**
   * Удаляет все развертки для конкретной 3D фигуры
   * @param {string} parentShapeId - UUID 3D фигуры
   */
  removeByParentShapeId(parentShapeId) {
    const toRemove = []
    for (const [id, unfold] of this.entities.entries()) {
      if (unfold.mesh.userData.parentShapeId === parentShapeId) {
        toRemove.push(id)
      }
    }
    toRemove.forEach(id => this.entities.delete(id))
  }

  /**
   * Очищает все развертки
   */
  clear() {
    this.entities.clear()
  }

  /**
   * Получает все развертки
   * @returns {UnfoldDetail[]}
   */
  getAll() {
    return Array.from(this.entities.values())
  }

  /**
   * Получает количество разверток
   * @returns {number}
   */
  count() {
    return this.entities.size
  }
}
