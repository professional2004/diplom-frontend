export class UnfoldSystem {
  constructor() {
    console.log('[->] UnfoldSystem: constructor')
    this.entities = new Map()
    this.nextId = 1
  }

  add(unfoldDetail) {
    console.log('[->] UnfoldSystem: add()')
    const id = `unfold-${this.nextId++}`
    unfoldDetail.mesh.userData.unfoldId = id
    this.entities.set(id, unfoldDetail)
    return id
  }

  getById(id) {
    console.log('[->] UnfoldSystem: getById()')
    return this.entities.get(id) || null
  }

  getByMesh(mesh) {
    console.log('[->] UnfoldSystem: getByMesh()')
    for (const unfold of this.entities.values()) {
      if (unfold.mesh === mesh) return unfold
    }
    return null
  }

  getByParentShapeId(parentShapeId) {
    console.log('[->] UnfoldSystem: getByParentShapeId()')
    const result = []
    for (const unfold of this.entities.values()) {
      if (unfold.mesh.userData.parentShapeId === parentShapeId) {
        result.push(unfold)
      }
    }
    return result
  }

  remove(id) {
    console.log('[->] UnfoldSystem: remove()')
    this.entities.delete(id)
  }

  removeByParentShapeId(parentShapeId) {
    console.log('[->] UnfoldSystem: removeByParentShapeId()')
    const toRemove = []
    for (const [id, unfold] of this.entities.entries()) {
      if (unfold.mesh.userData.parentShapeId === parentShapeId) {
        toRemove.push(id)
      }
    }
    toRemove.forEach(id => this.entities.delete(id))
  }

  clear() {
    console.log('[->] UnfoldSystem: clear()')
    this.entities.clear()
  }

  getAll() {
    console.log('[->] UnfoldSystem: getAll()')
    return Array.from(this.entities.values())
  }

  count() {
    console.log('[->] UnfoldSystem: count()')
    return this.entities.size
  }
}
