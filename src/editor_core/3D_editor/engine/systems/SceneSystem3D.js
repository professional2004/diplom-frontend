import * as THREE from 'three'

export class SceneSystem3D {
  constructor(options = {}) {
    console.log('[->] SceneSystem3D: constructor')
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(options.backgroundColor ?? 0xe2e2e2)

    // Свет
    const light = new THREE.DirectionalLight(0xffffff, 1)
    light.position.set(10, 10, 10)
    this.scene.add(light)
    this.scene.add(new THREE.AmbientLight(0x404040))
    
    // Инициализация сетки с сохранением параметров
    this.grid = null
    this.initGrid(options.gridSize ?? 20, options.gridDivisions ?? 20)

    // Плоскость земли
    if (!options.noGround) {
      this._initGround(options.gridSize ?? 20, options.groundVisible ?? false)
    }
  }

  initGrid(size, divisions) {
    console.log('[->] SceneSystem3D: initGrid()')
    if (this.grid) this.remove(this.grid)

    this.grid = new THREE.GridHelper(size, divisions, 0x444444, 0x222222)
  
    // записываем данные для EngineRegistry
    this.grid.userData = {
      gridSize: size,
      gridDivisions: divisions
    }
    
    this.scene.add(this.grid)
  }

  _initGround(size, visible) {
    console.log('[->] SceneSystem3D: _initGround()')
    const geo = new THREE.PlaneGeometry(size * 2, size * 2)
    const mat = new THREE.MeshStandardMaterial({ color: 0xfafafa, side: THREE.DoubleSide })
    this.ground = new THREE.Mesh(geo, mat)
    this.ground.rotation.x = -Math.PI / 2
    this.ground.visible = visible
    this.scene.add(this.ground)
  }

  add(obj) {
    console.log('[->] SceneSystem3D: add()')
    this.scene.add(obj)
    // если наша система знает о ShapeSystem - зарегистрируем
    try {
      const registry = this.registry || (this.scene && this.scene.registry)
      if (registry && registry.shapeSystem && obj && obj.isMesh && obj.userData?.shapeType) {
        registry.shapeSystem.register(obj)
      }
    } catch (e) {
      // ignore
    }
  }
  remove(obj) { 
    console.log('[->] SceneSystem3D: remove()')
    this.scene.remove(obj) 
  }

  traverse(cb) { 
    console.log('[->] SceneSystem3D: traverse()')
    this.scene.traverse(cb) 
  }

  dispose() {
    console.log('[->] SceneSystem3D: dispose()')
    this.scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
        else obj.material.dispose()
      }
    })
    this.scene.clear()
  }
}
