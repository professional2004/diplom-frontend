import { ShapeRegistry } from '@/core/shapes/ShapeRegistry'

export class AddShapeCommand {
  constructor(sceneSystem, shapeType, params = {}) {
    this.sceneSystem = sceneSystem
    this.shapeType = shapeType
    this.params = params
    this.mesh = null
  }

  execute() {
    if (!this.mesh) {
      // Используем Registry для создания логики
      const shapeInstance = ShapeRegistry.create(this.shapeType, this.params)
      this.mesh = shapeInstance.createMesh()
      
      // Рандомная позиция, чтобы не накладывались
      this.mesh.position.x = (Math.random() - 0.5) * 5
      this.mesh.position.z = (Math.random() - 0.5) * 5
    }
    this.sceneSystem.add(this.mesh)
  }

  undo() {
    if (this.mesh) {
      this.sceneSystem.remove(this.mesh)
    }
  }
}