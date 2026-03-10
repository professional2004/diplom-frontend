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
}
