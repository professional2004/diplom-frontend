import { ShapeRegistry } from '@/editor_core/3D_editor/entities/ShapeRegistry'
import EngineRegistry from '@/editor_core/general/engine/EngineRegistry'

export class AddShapeCommand {
  constructor(sceneSystem, shapeType, params = {}) {
    this.sceneSystem = sceneSystem
    this.shapeType = shapeType
    this.params = params
    this.mesh = null
    this.is3DCommand = true 
  }

  execute() {
    if (!this.mesh) {
      // Используем Registry для создания логики
      const shapeInstance = ShapeRegistry.create(this.shapeType, this.params)
      this.mesh = shapeInstance.createMesh()
      
      // Рандомная позиция, чтобы не накладывались
      this.mesh.position.x = (Math.random() - 0.5) * 5
      this.mesh.position.z = (Math.random() - 0.5) * 5

      // после создания зарегистрируемся в ShapeSystem
      EngineRegistry.shapeSystem.register(this.mesh)
    }
    this.sceneSystem.add(this.mesh)
  }

  undo() {
    if (this.mesh) {
      this.sceneSystem.remove(this.mesh)
      EngineRegistry.shapeSystem.unregister(this.mesh)
    }
  }
}