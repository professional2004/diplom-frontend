import { ShapeRegistry } from '@/core/3D_editor/entities/ShapeRegistry'

export class UpdateShapeCommand {
  constructor(engine, mesh, newParams) {
    this.engine = engine
    this.mesh = mesh
    this.oldParams = { ...mesh.userData.params }
    this.newParams = { ...newParams }
    this.shapeType = mesh.userData.shapeType
    
    // Флаг заставит EngineRegistry автоматически вызвать syncSystem.rebuildAllFrom3D()
    this.is3DCommand = true 
  }

  execute() {
    this._applyParams(this.newParams)
  }

  undo() {
    this._applyParams(this.oldParams)
  }

  _applyParams(params) {
    // 1. Обновляем параметры в памяти
    this.mesh.userData.params = { ...params }

    // 2. Создаем временную фигуру через реестр, чтобы получить новую геометрию
    const shapeInstance = ShapeRegistry.create(this.shapeType, params)
    const tempMesh = shapeInstance.createMesh()

    // 3. Заменяем геометрию у выбранного объекта (старую удаляем во избежание утечек памяти)
    if (this.mesh.geometry) {
      this.mesh.geometry.dispose()
    }
    this.mesh.geometry = tempMesh.geometry
    
    // 4. Корректируем высоту Y (так как она зависит от параметра height)
    this.mesh.position.y = tempMesh.position.y

    // 5. Очищаем материал временного меша
    if (tempMesh.material) {
      tempMesh.material.dispose()
    }

    // 6. Уведомляем UI о применении новых параметров
    this.engine.registry.emitUIUpdate('params:changed', this.mesh)
  }
}