import { getGlobalEngineRegistry } from '@/editor_core/general/engine/EngineRegistry'

export class DeleteShapeCommand {
  constructor(sceneSystem, selectionSystem, meshOrEntity) {
    console.log('[->] DeleteShapeCommand: constructor')
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

    // Массив для хранения разорванных связей (для возможности Undo)
    this.deletedConnections = []
  }

  execute() {
    console.log('[->] DeleteShapeCommand: execute()')
    // Сохраняем и удаляем связи перед удалением фигуры
    const ER = getGlobalEngineRegistry()
    if (ER?.connectionSystem) {
      const connections = ER.connectionSystem.connections
      this.deletedConnections = connections.filter(c => c.parentId === this.mesh.uuid || c.childId === this.mesh.uuid)
      ER.connectionSystem.removeConnectionsForShape(this.mesh.uuid)
    }

    // перед удалением удаляем из реестра
    const ER2 = getGlobalEngineRegistry()
    ER2?.shapeSystem?.unregister(this.mesh)

    // Удаляем фигуру со сцены
    this.sceneSystem.remove(this.mesh)
    
    // Очищаем выделение, если удаляемая фигура была выбрана
    if (this.selectionSystem.getSelected() === this.mesh) {
      this.selectionSystem.clear()
    }
  }

  undo() {
    console.log('[->] DeleteShapeCommand: undo()')
    // Восстанавливаем фигуру со сцены с сохраненными параметрами
    this.sceneSystem.add(this.mesh)

    // при возвращении необходимо снова зарегистрировать объект
    const ER3 = getGlobalEngineRegistry()
    if (ER3 && ER3.shapeSystem) {
      ER3.shapeSystem.register(this.mesh)
    }
    
    // Восстанавливаем трансформацию
    this.mesh.position.copy(this.position)
    this.mesh.rotation.copy(this.rotation)
    this.mesh.scale.copy(this.scale)

    // Восстанавливаем связи при отмене удаления
    const ER4 = getGlobalEngineRegistry()
    if (ER4?.connectionSystem && this.deletedConnections.length > 0) {
      this.deletedConnections.forEach(conn => {
        ER4.connectionSystem.addConnection(conn)
      })
      this.deletedConnections = []
    }
  }
}
