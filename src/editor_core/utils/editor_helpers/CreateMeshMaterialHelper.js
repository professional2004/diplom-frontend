import * as THREE from 'three'

export class CreateMeshMaterialHelper {
  static help(materials, material_id, meshClass) {
    const materialData = materials.find(m => m.id === material_id)
    if (meshClass === 'surface') { return this.createMaterialForSurface(materialData) }
    return null
  }

  // текстура для surface
  static createMaterialForSurface(materialData) {
    // Подготовка цвета (превращаем "cccccc" в 0xcccccc)
    const materialColor = parseInt(materialData.color, 16)
    const material = new THREE.MeshStandardMaterial({
      color: materialColor,
      side: THREE.DoubleSide,
      metalness: 0.1,
      roughness: 0.5
    })
    return material
  }
}