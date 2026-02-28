export class UnfoldSystem {
  constructor() {
    this.entities = new Map()
    this.nextId = 1
  }

  add(unfoldDetail) {
    const id = `unfold-${this.nextId++}`
    unfoldDetail.mesh.userData.unfoldId = id
    this.entities.set(id, unfoldDetail)
    return id
  }

  getById(id) {
    return this.entities.get(id) || null
  }

  getByMesh(mesh) {
    for (const unfold of this.entities.values()) {
      if (unfold.mesh === mesh) return unfold
    }
    return null
  }

  getByParentShapeId(parentShapeId) {
    const result = []
    for (const unfold of this.entities.values()) {
      if (unfold.mesh.userData.parentShapeId === parentShapeId) {
        result.push(unfold)
      }
    }
    return result
  }

  remove(id) {
    this.entities.delete(id)
  }

  removeByParentShapeId(parentShapeId) {
    const toRemove = []
    for (const [id, unfold] of this.entities.entries()) {
      if (unfold.mesh.userData.parentShapeId === parentShapeId) {
        toRemove.push(id)
      }
    }
    toRemove.forEach(id => this.entities.delete(id))
  }

  clear() {
    this.entities.clear()
  }

  getAll() {
    return Array.from(this.entities.values())
  }

  count() {
    return this.entities.size
  }
}
