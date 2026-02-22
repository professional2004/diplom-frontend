import * as THREE from 'three'

export class SceneSystem {
  constructor(options = {}) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(options.backgroundColor ?? 0xe2e2e2)

    // Свет
    const light = new THREE.DirectionalLight(0xffffff, 1)
    light.position.set(10, 10, 10)
    this.scene.add(light)
    this.scene.add(new THREE.AmbientLight(0x404040))

    // GridHelper (ориентир плоскости)
    const size = options.gridSize ?? 20
    const divisions = options.gridDivisions ?? 20
    this.grid = new THREE.GridHelper(size, divisions, 0x444444, 0x222222)
    this.scene.add(this.grid)

    // Опциональная плоскость "ground" (тонкая, чтобы не мешать), можно отключить через options.noGround=true
    if (!options.noGround) {
      const geo = new THREE.PlaneGeometry(size * 2, size * 2)
      const mat = new THREE.MeshStandardMaterial({ color: 0xfafafa, side: THREE.DoubleSide })
      this.ground = new THREE.Mesh(geo, mat)
      this.ground.rotation.x = -Math.PI / 2
      this.ground.position.y = 0
      this.ground.receiveShadow = false
      this.ground.visible = options.groundVisible ?? false // по умолчанию скрыта, включи при необходимости
      this.scene.add(this.ground)
    }
  }

  add(obj) {
    this.scene.add(obj)
  }

  remove(obj) {
    this.scene.remove(obj)
  }

  traverse(cb) {
    this.scene.traverse(cb)
  }

  dispose() {
    // Уничтожаем примитивы, если нужно
    if (this.grid) {
      if (this.grid.geometry) this.grid.geometry.dispose()
      if (this.grid.material) {
        if (Array.isArray(this.grid.material)) {
          this.grid.material.forEach(m => m.dispose && m.dispose())
        } else {
          this.grid.material.dispose && this.grid.material.dispose()
        }
      }
      this.scene.remove(this.grid)
      this.grid = null
    }

    if (this.ground) {
      if (this.ground.geometry) this.ground.geometry.dispose()
      if (this.ground.material) this.ground.material.dispose()
      this.scene.remove(this.ground)
      this.ground = null
    }
  }
}
