export class SelectionSystem2D {
  constructor() {
    this.selected = null
    this.hovered = null
  }

  setSelected(object) {
    if (this.selected && this.selected !== object) this.restoreOriginalMaterial(this.selected)
    this.selected = object
    if (object) this.applySelectMaterial(object)
  }

  setHovered(object) {
    if (this.hovered && this.hovered !== object && this.hovered !== this.selected) {
      this.restoreOriginalMaterial(this.hovered)
    }
    this.hovered = object
    if (object && object !== this.selected) this.applyHoverMaterial(object)
  }

  clear() {
    if (this.selected) this.restoreOriginalMaterial(this.selected)
    if (this.hovered) this.restoreOriginalMaterial(this.hovered)
    this.selected = null
    this.hovered = null
  }

  applySelectMaterial(object) {
    object.traverse(child => {
      if (child.isLine) child.material.color.setHex(0xFF6600)
    })
  }

  applyHoverMaterial(object) {
    object.traverse(child => {
      if (child.isLine) child.material.color.setHex(0xFFBB55)
    })
  }

  restoreOriginalMaterial(object) {
    object.traverse(child => {
      if (child.isLine && child.userData.originalColor !== undefined) {
        child.material.color.setHex(child.userData.originalColor)
      }
    })
  }
}