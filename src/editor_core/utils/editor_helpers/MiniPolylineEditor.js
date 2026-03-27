export class MiniPolylineEditor {
  constructor() {
    this.points = []
  }

  setPoints(points = []) {
    this.points = points.map(p => ({ x: p.x, y: p.y }))
  }

  getPoints() {
    return this.points.map(p => ({ x: p.x, y: p.y }))
  }

  clear() {
    this.points = []
  }

  movePoint(index, position) {
    if (index < 0 || index >= this.points.length) return
    this.points[index] = { x: position.x, y: position.y }
  }

  removePoint(index) {
    if (index < 0 || index >= this.points.length) return false
    if (this.points.length <= 3) return false
    this.points.splice(index, 1)
    return true
  }

  addPointAtNearestSegment(position) {
    if (this.points.length < 2) {
      this.points.push({ x: position.x, y: position.y })
      return
    }

    let minDist = Infinity
    let insertAfterIndex = 0

    for (let i = 0; i < this.points.length - 1; i++) {
      const a = this.points[i]
      const b = this.points[i + 1]
      const nearest = MiniPolylineEditor.getClosestPointOnSegment(position, a, b)
      const dx = position.x - nearest.x
      const dy = position.y - nearest.y
      const distSq = dx * dx + dy * dy
      if (distSq < minDist) {
        minDist = distSq
        insertAfterIndex = i
      }
    }

    this.points.splice(insertAfterIndex + 1, 0, { x: position.x, y: position.y })
  }

  static getClosestPointOnSegment(p, a, b) {
    const abx = b.x - a.x
    const aby = b.y - a.y
    const abLenSq = abx * abx + aby * aby

    if (abLenSq === 0) {
      return { x: a.x, y: a.y }
    }

    const t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / abLenSq
    const tClamped = Math.max(0, Math.min(1, t))

    return {
      x: a.x + abx * tClamped,
      y: a.y + aby * tClamped
    }
  }
}
