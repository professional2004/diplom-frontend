import * as THREE from 'three'

export class SceneSystem2D {
  constructor() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xf0f0f0)

    // По-умолчанию сетка 2D
    this.grid = null
    this._createGrid(100, 50)

    this.unfoldObjects = new THREE.Group()
    this.scene.add(this.unfoldObjects)
  }

  _createGrid(size = 100, divisions = 50) {
    if (this.grid) {
      this.scene.remove(this.grid)
      // очищаем ресурсы, если надо
      if (this.grid.geometry) this.grid.geometry.dispose()
      if (this.grid.material) {
        if (Array.isArray(this.grid.material)) {
          this.grid.material.forEach(m => m.dispose && m.dispose())
        } else {
          this.grid.material.dispose && this.grid.material.dispose()
        }
      }
      this.grid = null
    }
    this.grid = new THREE.GridHelper(size, divisions, 0xddd, 0xeee)
    this.grid.rotation.x = -Math.PI / 2
    this.scene.add(this.grid)
  }

  /**
   * Подогнать 2D-сетку под параметры 3D-сетки (если они доступны)
   * gridHelper3D — GridHelper из 3D сцены (или null)
   */
  matchGridFrom(gridHelper3D) {
    if (!gridHelper3D) return
    const size = gridHelper3D.userData?.gridSize ?? 100
    const divisions = gridHelper3D.userData?.gridDivisions ?? Math.max(10, Math.floor(size / 2))
    this._createGrid(size, divisions)
  }

  add(obj) { this.unfoldObjects.add(obj) }
  remove(obj) { this.unfoldObjects.remove(obj) }
  
  clearUnfolds() {
    while(this.unfoldObjects.children.length > 0){ 
      this.unfoldObjects.remove(this.unfoldObjects.children[0]) 
    }
  }

  dispose() {
    this.scene.clear()
  }
}