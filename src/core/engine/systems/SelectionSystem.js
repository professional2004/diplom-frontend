export class SelectionSystem {
  constructor() {
    this.selected = null
    this.hovered = null
    
    // Сохраняем исходные материалы для восстановления
    this.originalMaterials = new Map()
  }

  /**
   * Устанавливает выбранный объект и применяет подсветку
   */
  setSelected(object) {
    // Восстанавливаем материал предыдущей выбранной фигуры
    if (this.selected && this.selected !== object) {
      this.restoreOriginalMaterial(this.selected)
    }

    this.selected = object
    
    // Применяем материал выбранной фигуры
    if (object) {
      this.applySelectMaterial(object)
      console.log('Selected:', object.userData.shapeType || 'unknown shape')
    }
  }

  /**
   * Устанавливает объект под курсором (hover)
   */
  setHovered(object) {
    // Восстанавливаем материал предыдущей наведенной фигуры (если это не текущая выбранная)
    if (this.hovered && this.hovered !== object && this.hovered !== this.selected) {
      this.restoreOriginalMaterial(this.hovered)
    }

    this.hovered = object

    // Применяем материал наведенной фигуры (если это не выбранная фигура)
    if (object && object !== this.selected) {
      this.applyHoverMaterial(object)
    }
  }

  /**
   * Очищает выделение
   */
  clear() {
    if (this.selected) {
      this.restoreOriginalMaterial(this.selected)
      this.selected = null
    }
    if (this.hovered && this.hovered !== this.selected) {
      this.restoreOriginalMaterial(this.hovered)
      this.hovered = null
    }
  }

  /**
   * Применяет материал при выборе (ярко выделенный)
   */
  applySelectMaterial(object) {
    if (!object.material) return

    // Сохраняем исходный материал, если еще не сохранили
    if (!this.originalMaterials.has(object)) {
      this.originalMaterials.set(object, object.material.clone())
    }

    // Создаем материал выбранной фигуры (ярко-оранжевое излучение)
    object.material.emissive.setHex(0xFF8800)
    object.material.emissiveIntensity = 0.8
  }

  /**
   * Применяет материал при наведении (слегка выделенный)
   */
  applyHoverMaterial(object) {
    if (!object.material) return

    // Сохраняем исходный материал, если еще не сохранили
    if (!this.originalMaterials.has(object)) {
      this.originalMaterials.set(object, object.material.clone())
    }

    // Создаем материал наведенной фигуры (светло-желтое излучение)
    object.material.emissive.setHex(0xFFDD00)
    object.material.emissiveIntensity = 0.5
  }

  /**
   * Восстанавливает исходный материал
   */
  restoreOriginalMaterial(object) {
    if (!object.material) return

    const original = this.originalMaterials.get(object)
    if (original) {
      object.material.emissive.setHex(0x000000)
      object.material.emissiveIntensity = 0
    }
  }

  /**
   * Возвращает текущий выбранный объект
   */
  getSelected() {
    return this.selected
  }

  /**
   * Возвращает текущий наведенный объект
   */
  getHovered() {
    return this.hovered
  }

  update() {
    // пассивно — пока оставляем пустым
  }

  dispose() {
    // Очищаем сохраненные материалы при удалении
    this.originalMaterials.clear()
  }
}
