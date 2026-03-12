// tracks logical shape entities separate from view meshes
export class ShapeSystem {
  constructor(registry) {
    this.registry = registry
    // Map from mesh.uuid to entity
    this.entities = new Map()
  }

  // Entity object stored in the system { id: string, mesh: THREE.Mesh, owner: Object }

  register(mesh) {
    if (!mesh || !mesh.uuid) return null
    // если тот же экземпляр уже присутствует под другим ключом,
    // удаляем старую запись (например после изменения mesh.uuid)
    for (const [key, ent] of this.entities.entries()) {
      if (ent.mesh === mesh && key !== mesh.uuid) {
        this.entities.delete(key)
        break
      }
    }
    const owner = mesh.userData.owner || null
    const ent = { id: mesh.uuid, mesh, owner }
    this.entities.set(mesh.uuid, ent)
    return ent
  }

  unregister(mesh) {
    if (!mesh || !mesh.uuid) return
    this.entities.delete(mesh.uuid)
  }

  getById(id) {
    return this.entities.get(id) || null
  }

  getByMesh(mesh) {
    if (!mesh) return null
    return this.entities.get(mesh.uuid) || null
  }

  // helper used when a mesh's parameters have been changed, emits event
  notifyParamsChanged(mesh) {
    const ent = this.getByMesh(mesh)
    this.registry.emitUIUpdate('params:changed', ent)
  }

  // Метод для тихого обновления параметров из Солвера (без вызова новой команды History)
  updateShapeParamsSilent(id, params) {
    const ent = this.getById(id)
    if (!ent || !ent.mesh) return

    // 1. Обновляем данные
    ent.mesh.userData.params = { ...params }
    if (ent.owner && ent.owner.params) {
      ent.owner.params = { ...params }
    }

    // 2. Обновляем трансформации (для связей "ребро к ребру" геометрию перестраивать не нужно, только позицию и поворот)
    ent.mesh.position.set(params.posX || 0, params.posY || 0, params.posZ || 0)
    ent.mesh.rotation.set(params.rotationX || 0, params.rotationY || 0, params.rotationZ || 0, 'XYZ')

    // 3. Обновляем мировые матрицы для последующих расчетов зависимостей
    ent.mesh.updateMatrixWorld(true)

    // 4. Оповещаем UI, чтобы правая панель (ShapeChangeBoard) обновила цифры
    this.notifyParamsChanged(ent.mesh)
  }
}
