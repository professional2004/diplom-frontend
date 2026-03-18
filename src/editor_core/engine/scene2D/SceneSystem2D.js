import * as THREE from 'three'

export class SceneSystem2D {
  constructor() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xf0f0f0)

    // сетка
    this.grid = new THREE.GridHelper(20, 20, 0xcccccc, 0x000000)
    this.grid.rotation.x = -Math.PI / 2
    this.scene.add(this.grid)

    // объекты
    this.objects = new THREE.Group()
    this.scene.add(this.objects)
  }

  add(object) { 
    this.objects.add(object) 
  }

  remove(object) { 
    this.objects.remove(object) 
  }
  
  clearObjects() {
    while (this.objects.children.length > 0) {
      const object = this.objects.children[0]
      if (object.geometry) object.geometry.dispose()
      if (object.material) object.material.dispose()
      this.objects.remove(object)
    }
  }

  dispose() {
    this.clearObjects()
    if (this.grid) {
      this.grid.geometry.dispose()
      this.grid.material.dispose()
    }
    this.scene.clear()
  }
}