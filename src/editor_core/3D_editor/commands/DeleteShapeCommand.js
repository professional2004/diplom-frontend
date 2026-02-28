import EngineRegistry from '@/editor_core/general/engine/EngineRegistry'

export class DeleteShapeCommand {
  constructor(sceneSystem, selectionSystem, meshOrEntity) {
    this.sceneSystem = sceneSystem
    this.selectionSystem = selectionSystem
    this.mesh = meshOrEntity && meshOrEntity.mesh ? meshOrEntity.mesh : meshOrEntity
    this.is3DCommand = true 
    
    // Сохраняем данные фигуры для восстановления
    this.shapeType = this.mesh.userData.shapeType
    this.params = this.mesh.userData.params ? { ...this.mesh.userData.params } : {}
    this.position = this.mesh.position.clone()
    this.rotation = this.mesh.rotation.clone()
    this.scale = this.mesh.scale.clone()
    this.materialColor = this.mesh.material?.color?.getHex?.() || 0xffffff
  }

  execute() {
    // перед удалением удаляем из реестра
    EngineRegistry.shapeSystem.unregister(this.mesh)

    // Удаляем фигуру со сцены
    this.sceneSystem.remove(this.mesh)
    
    // Очищаем выделение, если удаляемая фигура была выбрана
    if (this.selectionSystem.getSelected() === this.mesh) {
      this.selectionSystem.clear()
    }
  }

  undo() {
    // Восстанавливаем фигуру со сцены с сохраненными параметрами
    this.sceneSystem.add(this.mesh)

    // при возвращении необходимо снова зарегистрировать объект
    if (EngineRegistry && EngineRegistry.shapeSystem) {
      EngineRegistry.shapeSystem.register(this.mesh)
    }
    
    // Восстанавливаем трансформацию
    this.mesh.position.copy(this.position)
    this.mesh.rotation.copy(this.rotation)
    this.mesh.scale.copy(this.scale)
  }
}
