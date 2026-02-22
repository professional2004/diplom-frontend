import * as THREE from 'three'

export class SceneSystem2D {
  constructor() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xf0f0f0)

    // Сетка на плоскости XY
    this.grid = new THREE.GridHelper(100, 50, 0xddd, 0xeee)
    this.grid.rotation.x = -Math.PI / 2
    this.scene.add(this.grid)
    
    this.unfoldObjects = new THREE.Group()
    this.scene.add(this.unfoldObjects)
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