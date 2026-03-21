import * as THREE from 'three'

export class SceneSystem3D {
  constructor() {
    this.engine = null
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xe2e2e2)

    // свет
    const light = new THREE.DirectionalLight(0xffffff, 1)
    light.position.set(10, 10, 10)
    this.scene.add(light)
    this.scene.add(new THREE.AmbientLight(0x404040))

    // сетка
    this.grid = new THREE.GridHelper(20, 20, 0x444444, 0x222222)
    this.scene.add(this.grid)

    // объекты
    this.objects = new THREE.Group()
    this.scene.add(this.objects)

    // материал для подсветки объектов
    const materialHighlightColor = new THREE.Color(1, 1, 0.8)
    this.materialHighlight = new THREE.MeshStandardMaterial({
      color: materialHighlightColor,
      emissive: materialHighlightColor,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      metalness: 0.1,
      roughness: 0.5
    })

    // материал для выделения объектов
    const materialSelectColor = new THREE.Color(1, 1, 0.8)
    this.materialSelect = new THREE.MeshStandardMaterial({
      color: materialSelectColor,
      emissive: materialSelectColor,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      metalness: 0.1,
      roughness: 0.5
    })
  }

  setEngine(engine) {
    this.engine = engine 
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

  // Подсветить наведенную фигуру
  setHightlightForHoveredObject(id) {
    this.clearHightlightForHoveredObject()
    const newObject = this.findObjectById(id)
    newObject.material = this.materialHighlight
    newObject.userData.hovered = true
  }

  // Подсветить выделенную фигуру
  setHightlightForSelectedObject(id) {
    this.clearHightlightForSelectedObject()
    const newObject = this.findObjectById(id)
    newObject.material = this.materialSelect
    newObject.userData.selected = true
  }

  // очистить подсветку фигур
  clearHightlightForHoveredObject() {
    const previousMesh = this.findHoveredObject()
    if (previousMesh) {
      const materials = this.engine.project.getMaterials()
      const previousMaterial = CreateMeshMaterialHelper.help(materials, previousMesh.object.userData.material_id, previousMesh.object.userData.class)
      previousMesh.material = previousMaterial
      previousMesh.object.userData.hovered = false
    }
  }

  // очистить выделение фигур
  clearHightlightForSelectedObject() {
    const previousMesh = this.findSelectedObject()
    if (previousMesh) {
      const materials = this.engine.project.getMaterials()
      const previousMaterial = CreateMeshMaterialHelper.help(materials, previousMesh.object.userData.material_id, previousMesh.object.userData.class)
      previousMesh.material = previousMaterial
      previousMesh.object.userData.selected = false
    }
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



  // ------------ хелперы для нахождения объектов ------------

  // Найти mesh по id
  findObjectById(id) {
    for (const child of this.objects.children) {
      if (child.userData?.id === id) { return child }
    }
    return null
  }

  // Найти подсвеченный mesh
  findHoveredObject() {
    for (const child of this.objects.children) {
      if (child.userData?.hovered === true) { return child }
    }
    return null
  }

  // Найти выделенный mesh
  findSelectedObject() {
    for (const child of this.objects.children) {
      if (child.userData?.selected === true) { return child }
    }
    return null
  }


}