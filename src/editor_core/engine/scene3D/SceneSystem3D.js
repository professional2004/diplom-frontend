import * as THREE from 'three'

export class SceneSystem3D {
  constructor() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xe2e2e2)

    // свет
    const light = new THREE.DirectionalLight(0xffffff, 1)
    light.position.set(10, 10, 10)
    this.scene.add(light)
    this.scene.add(new THREE.AmbientLight(0x404040))

    // сетка
    this.grid = new THREE.GridHelper(20, 20, 0x444444, 0x222222)
    this.grid.rotation.x = -Math.PI / 2
    this.scene.add(this.grid)

    // объекты
    this.objects = new THREE.Group()
    this.scene.add(this.objects)
  }

  getScene() {
    return this.scene
  }

  getObjects() {
    return this.objects.children
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