import { ShapeRegistry } from '@/core/shapes/ShapeRegistry'

export class DeleteShapeCommand {
  constructor(sceneSystem, selectionSystem, mesh, store = null) {
    this.sceneSystem = sceneSystem
    this.selectionSystem = selectionSystem
    this.store = store
    this.mesh = mesh
    
    // Сохраняем данные фигуры для восстановления
    this.shapeType = mesh.userData.shapeType
    this.params = mesh.userData.params ? { ...mesh.userData.params } : {}
    this.position = mesh.position.clone()
    this.rotation = mesh.rotation.clone()
    this.scale = mesh.scale.clone()
    this.materialColor = mesh.material?.color?.getHex?.() || 0xffffff
  }

  execute() {
    // Удаляем фигуру со сцены
    this.sceneSystem.remove(this.mesh)
    
    // Очищаем выделение если удаляемая фигура была выбрана
    if (this.selectionSystem.getSelected() === this.mesh) {
      this.selectionSystem.clear()
      
      // Обновляем store для реактивности UI
      if (this.store) {
        this.store.updateSelectedShape(null)
      }
    }
  }

  undo() {
    // Восстанавливаем фигуру со сцены с сохраненными параметрами
    this.sceneSystem.add(this.mesh)
    
    // Восстанавливаем трансформацию
    this.mesh.position.copy(this.position)
    this.mesh.rotation.copy(this.rotation)
    this.mesh.scale.copy(this.scale)
  }
}
