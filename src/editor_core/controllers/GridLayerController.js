import * as THREE from 'three'


export class GridLayerController {
  constructor(scene, size = 20, divisions = 20) {
    this.scene = scene
    this.grid = new THREE.GridHelper(size, divisions, 0x444444, 0x222222)
    this.scene.add(this.grid)
  }


  setVisible(isVisible) {
    this.grid.visible = isVisible
  }


  dispose() {
    if (!this.grid) return
    if (this.grid.geometry) this.grid.geometry.dispose()
    if (this.grid.material) this.grid.material.dispose()
    this.scene.remove(this.grid)
    this.grid = null
  }
}