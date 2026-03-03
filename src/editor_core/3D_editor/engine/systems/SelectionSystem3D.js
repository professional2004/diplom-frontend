export class SelectionSystem3D {
  constructor() {
    console.log('[->] SelectionSystem3D: constructor')
    this.selected = null
    this.hovered = null
    
    // Сохраняем исходные материалы для восстановления
    this.originalMaterials = new Map()
  }

  // Устанавливает выбранный объект и применяет подсветку
  setSelected(object) {
    console.log('[->] SelectionSystem3D: setSelected()')
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

  // Устанавливает объект под курсором (hover)
  setHovered(object) {
    console.log('[->] SelectionSystem3D: setHovered()')
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

  // Очищает выделение
  clear() {
    console.log('[->] SelectionSystem3D: clear()')
    if (this.selected) {
      this.restoreOriginalMaterial(this.selected)
      this.selected = null
    }
    if (this.hovered && this.hovered !== this.selected) {
      this.restoreOriginalMaterial(this.hovered)
      this.hovered = null
    }
  }

  // Применяет материал при выборе (ярко выделенный)
  applySelectMaterial(object) {
    console.log('[->] SelectionSystem3D: applySelectMaterial()')
    if (!object.material) return

    // Сохраняем исходный материал, если еще не сохранили
    if (!this.originalMaterials.has(object)) {
      this.originalMaterials.set(object, object.material.clone())
    }

    // Создаем материал выбранной фигуры (ярко-оранжевое излучение)
    object.material.emissive.setHex(0xFF8800)
    object.material.emissiveIntensity = 0.8
  }

  // Применяет материал при наведении (слегка выделенный)
  applyHoverMaterial(object) {
    console.log('[->] SelectionSystem3D: applyHoverMaterial()')
    if (!object.material) return

    // Сохраняем исходный материал, если еще не сохранили
    if (!this.originalMaterials.has(object)) {
      this.originalMaterials.set(object, object.material.clone())
    }

    // Создаем материал наведенной фигуры (светло-желтое излучение)
    object.material.emissive.setHex(0xFFDD00)
    object.material.emissiveIntensity = 0.5
  }

  // Восстанавливает исходный материал
  restoreOriginalMaterial(object) {
    console.log('[->] SelectionSystem3D: restoreOriginalMaterial()')
    if (!object.material) return

    const original = this.originalMaterials.get(object)
    if (original) {
      object.material.emissive.setHex(0x000000)
      object.material.emissiveIntensity = 0
    }
  }

  // Возвращает текущий выбранный объект
  getSelected() {
    console.log('[->] SelectionSystem3D: getSelected()')
    return this.selected
  }

  // Возвращает текущий наведенный объект
  getHovered() {
    console.log('[->] SelectionSystem3D: getHovered()')
    return this.hovered
  }

  update() {
    // console.log('[->] SelectionSystem3D: update()')
    // пассивно — пока оставляем пустым
  }

  dispose() {
    console.log('[->] SelectionSystem3D: dispose()')
    // Очищаем сохраненные материалы при удалении
    this.originalMaterials.clear()
  }
}
