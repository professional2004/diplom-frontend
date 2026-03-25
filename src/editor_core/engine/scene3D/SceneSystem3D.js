import * as THREE from 'three'
import { CreateMeshMaterialHelper } from '@/editor_core/utils/editor_helpers/CreateMeshMaterialHelper'

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
  setHightlightForHoveredObject(object) {
    this.clearHightlightForHoveredObject()
    if (!object) return

    if (object.class === 'detail') {
      const surfaceIds = this.getSurfacesForDetail(object.id)
      for (const surfaceId of surfaceIds) {
        const mesh = this.findObjectById(surfaceId)
        if (mesh) {
          mesh.material = this.materialHighlight
          mesh.userData.hovered = true
        }
      }
    } else {
      const mesh = this.findObjectById(object.id)
      if (mesh) {
        mesh.material = this.materialHighlight
        mesh.userData.hovered = true
      }
    }
  }

  // Подсветить выделенную фигуру
  setHightlightForSelectedObject(object) {
    this.clearHightlightForSelectedObject()
    if (!object) return

    if (object.class === 'detail') {
      const surfaceIds = this.getSurfacesForDetail(object.id)
      for (const surfaceId of surfaceIds) {
        const mesh = this.findObjectById(surfaceId)
        if (mesh) {
          mesh.material = this.materialSelect
          mesh.userData.selected = true
        }
      }
    } else {
      const mesh = this.findObjectById(object.id)
      if (mesh) {
        mesh.material = this.materialSelect
        mesh.userData.selected = true
      }
    }
  }

  // очистить подсветку фигур
  clearHightlightForHoveredObject() {
    const previousMeshes = this.findHoveredObject()
    for (const previousMesh of previousMeshes) {
      const materials = this.engine.project.getMaterials()
      const previousMaterial = CreateMeshMaterialHelper.help(materials, previousMesh.userData.material_id, previousMesh.userData.class)
      previousMesh.material = previousMaterial
      previousMesh.userData.hovered = false
    }
  }

  // очистить выделение фигур
  clearHightlightForSelectedObject() {
    const previousMeshes = this.findSelectedObject()
    for (const previousMesh of previousMeshes) {
      const materials = this.engine.project.getMaterials()
      const previousMaterial = CreateMeshMaterialHelper.help(materials, previousMesh.userData.material_id, previousMesh.userData.class)
      previousMesh.material = previousMaterial
      previousMesh.userData.selected = false
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

  // Получить ids поверхностей для детали
  getSurfacesForDetail(detailId) {
    const details = this.engine.project.getDetails()
    const detail = details.find(d => d.id === detailId)
    return detail ? detail.surfaces.map(s => s.id) : []
  }

  // Найти подсвеченный mesh
  findHoveredObject() {
    const hoveredObjects = []
    for (const child of this.objects.children) {
      if (child.userData?.hovered === true) {
        hoveredObjects.push(child)
      }
    }
    return hoveredObjects
  }

  // Найти выделенный mesh
  findSelectedObject() {
    const selectedObjects = []
    for (const child of this.objects.children) {
      if (child.userData?.selected === true) {
        selectedObjects.push(child)
      }
    }
    return selectedObjects
  }


}