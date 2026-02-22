import * as THREE from 'three'
import { primitives } from '@jscad/modeling'
import { BaseShape } from '../BaseShape'
import { createMeshFromJscad } from '@/core/general/utils/JscadAdapter'

export class RoundedPrismShape extends BaseShape {
  get defaultParams() {
    return { width: 3, depth: 2, height: 4, radius: 0.5 }
  }

  // Вспомогательный метод для построения контура скруглённого прямоугольника (для развёртки)
  _createShapePath(w, d, r) {
    const shape = new THREE.Shape()
    const x = -w / 2
    const y = -d / 2

    shape.moveTo(x, y + r)
    shape.lineTo(x, y + d - r)
    shape.absarc(x + r, y + d - r, r, Math.PI, Math.PI / 2, true) // левый верхний угол
    shape.lineTo(x + w - r, y + d)
    shape.absarc(x + w - r, y + d - r, r, Math.PI / 2, 0, true)   // правый верхний угол
    shape.lineTo(x + w, y + r)
    shape.absarc(x + w - r, y + r, r, 0, -Math.PI / 2, true)      // правый нижний угол
    shape.lineTo(x + r, y)
    shape.absarc(x + r, y + r, r, -Math.PI / 2, -Math.PI, true)   // левый нижний угол

    return shape
  }

  createMesh() {
    const { width, depth, height, radius } = this.params
    const safeRadius = Math.min(radius, width / 2, depth / 2)

    // JSCAD: roundedCuboid(size: [x, y, z], roundRadius)
    // Ось Y соответствует высоте, поэтому size: [width, height, depth]
    const jscadGeom = primitives.roundedCuboid({
      size: [width, height, depth],
      roundRadius: safeRadius
    })

    const mesh = createMeshFromJscad(jscadGeom, this.getStandardMaterial())

    mesh.userData.shapeType = 'roundedPrism'
    mesh.userData.params = this.params
    mesh.userData.selectable = true

    // Смещаем так, чтобы фигура стояла на "полу" (Y = 0)
    mesh.position.y = height / 2

    return mesh
  }

  createUnfold2D() {
    const { width, depth, height, radius } = this.params
    const r = Math.min(radius, width / 2, depth / 2)
    const group = new THREE.Group()
    const lineMat = this.getLineMaterial()

    // ------------------- Дно (скруглённый прямоугольник) -------------------
    const bottomGroup = new THREE.Group()
    const bottomShape = this._createShapePath(width, depth, r)
    const bottomPoints = bottomShape.getPoints().map(p => new THREE.Vector3(p.x, p.y, 0))
    const bottomGeo = new THREE.BufferGeometry().setFromPoints(bottomPoints)
    bottomGroup.add(new THREE.Line(bottomGeo, lineMat))
    group.add(bottomGroup)

    // ------------------- Крышка (такой же, но смещён) -------------------
    const topGroup = new THREE.Group()
    const topShape = this._createShapePath(width, depth, r)
    const topOffsetY = depth + height // размещаем над задней гранью
    const topPoints = topShape.getPoints().map(p => new THREE.Vector3(p.x, p.y + topOffsetY, 0))
    const topGeo = new THREE.BufferGeometry().setFromPoints(topPoints)
    topGroup.add(new THREE.Line(topGeo, lineMat))
    group.add(topGroup)

    // ------------------- Передняя грань (прямоугольник) -------------------
    const frontGroup = new THREE.Group()
    const frontW = width - 2 * r
    const frontH = height
    const frontYBottom = -depth / 2
    const frontPoints = [
      [-frontW / 2, frontYBottom - frontH],
      [ frontW / 2, frontYBottom - frontH],
      [ frontW / 2, frontYBottom],
      [-frontW / 2, frontYBottom],
      [-frontW / 2, frontYBottom - frontH] // замыкание
    ].map(p => new THREE.Vector3(p[0], p[1], 0))
    frontGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(frontPoints), lineMat))
    group.add(frontGroup)

    // ------------------- Задняя грань -------------------
    const backGroup = new THREE.Group()
    const backW = width - 2 * r
    const backH = height
    const backYTop = depth / 2
    const backPoints = [
      [-backW / 2, backYTop],
      [ backW / 2, backYTop],
      [ backW / 2, backYTop + backH],
      [-backW / 2, backYTop + backH],
      [-backW / 2, backYTop]
    ].map(p => new THREE.Vector3(p[0], p[1], 0))
    backGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(backPoints), lineMat))
    group.add(backGroup)

    // ------------------- Левая грань (повёрнута: ширина = высота призмы) -------------------
    const leftGroup = new THREE.Group()
    const leftW = height               // ширина по X
    const leftH = depth - 2 * r        // высота по Y
    const leftXRight = -width / 2
    const leftYCenter = 0
    const leftPoints = [
      [leftXRight - leftW, leftYCenter - leftH / 2],
      [leftXRight,          leftYCenter - leftH / 2],
      [leftXRight,          leftYCenter + leftH / 2],
      [leftXRight - leftW, leftYCenter + leftH / 2],
      [leftXRight - leftW, leftYCenter - leftH / 2]
    ].map(p => new THREE.Vector3(p[0], p[1], 0))
    leftGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(leftPoints), lineMat))
    group.add(leftGroup)

    // ------------------- Правая грань -------------------
    const rightGroup = new THREE.Group()
    const rightW = height
    const rightH = depth - 2 * r
    const rightXLeft = width / 2
    const rightYCenter = 0
    const rightPoints = [
      [rightXLeft,          rightYCenter - rightH / 2],
      [rightXLeft + rightW, rightYCenter - rightH / 2],
      [rightXLeft + rightW, rightYCenter + rightH / 2],
      [rightXLeft,          rightYCenter + rightH / 2],
      [rightXLeft,          rightYCenter - rightH / 2]
    ].map(p => new THREE.Vector3(p[0], p[1], 0))
    rightGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(rightPoints), lineMat))
    group.add(rightGroup)

    return group
  }
}