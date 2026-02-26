import { ShapeRegistry } from '@/core/3D_editor/entities/ShapeRegistry'

export class UpdateShapeCommand {
  /**
   * @param {Engine3D} engine  полный 3D‑движок (нужен для доступа к registry)
   * @param {THREE.Mesh} mesh   меш, параметры которого изменяются
   * @param {Object} newParams  новая конфигурация фигуры
   */
  constructor(engine, mesh, newParams) {
    this.engine = engine
    this.mesh = mesh

    // Сохраняем старые параметры до того, как UI начнёт их мутировать.
    // В идеале объекты параметров не должны меняться напрямую, но мы
    // копируем чтобы гарантировать корректную отмену.
    this.oldParams = mesh.userData.params ? { ...mesh.userData.params } : {}
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

    // 6. Пробрасываем событие, чтобы редактор обновил панель параметров
    this.engine.registry.emitUIUpdate('params:changed', this.mesh)
  }
}