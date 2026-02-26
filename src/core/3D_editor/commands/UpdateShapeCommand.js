import { ShapeRegistry } from '@/core/3D_editor/entities/ShapeRegistry'

export class UpdateShapeCommand {
  constructor(engine, meshOrEntity, newParams) {
    this.engine = engine
    // payload может быть либо THREE.Mesh либо shape-entity {id, mesh, owner}
    this.mesh = meshOrEntity && meshOrEntity.mesh ? meshOrEntity.mesh : meshOrEntity

    // Сохраняем старые параметры до того, как UI начнёт их мутировать.
    // В идеале объекты параметров не должны меняться напрямую, но мы
    // копируем чтобы гарантировать корректную отмену.
    this.oldParams = this.mesh.userData.params ? { ...this.mesh.userData.params } : {}
    this.newParams = { ...newParams }
    this.shapeType = this.mesh.userData.shapeType

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
    // 1. Обновляем параметры на меше и у логического владельца (если есть)
    this.mesh.userData.params = { ...params }
    if (this.mesh.userData.owner && this.mesh.userData.owner.params) {
      this.mesh.userData.owner.params = { ...params }
    }

    // 2. Пересоздаём геометрию через реестр (чтобы не дублировать логику)
    const shapeInstance = ShapeRegistry.create(this.shapeType, params)
    const tempMesh = shapeInstance.createMesh()

    // 3. Подменяем геометрию, не трогая остальные трансформации
    if (this.mesh.geometry) {
      this.mesh.geometry.dispose()
    }
    this.mesh.geometry = tempMesh.geometry

    // 4. Некоторые фигуры «садятся» на пол по-разному – поправляем Y
    this.mesh.position.y = tempMesh.position.y

    // 5. Удаляем материал временного меша, он нам не нужен
    if (tempMesh.material) {
      tempMesh.material.dispose()
    }

    // 6. Пробрасываем событие через ShapeSystem (отдаёт entity вместо "сырого" меша)
    if (this.engine && this.engine.registry && this.engine.registry.shapeSystem) {
      this.engine.registry.shapeSystem.notifyParamsChanged(this.mesh)
    } else {
      this.engine.registry.emitUIUpdate('params:changed', this.mesh)
    }
  }
}