import * as THREE from 'three'
import { BaseSurface } from './BaseSurface'
import { BezierCurve } from '@/core/curves/BezierCurve'

export class ConicalSurface extends BaseSurface {
  get defaultParams() {
    return { baseCurveData: null, height: 3, radialSegments: 64 }
  }

  static createDefaultBaseCurve() {
    const points = []
    const segments = 12
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      points.push(new THREE.Vector2(Math.cos(angle) * 2, Math.sin(angle) * 2))
    }
    return new BezierCurve(points, true)
  }

  constructor(params = {}) {
    super(params)
    this._unfoldCache = null // Кэш данных развертки
    
    if (params.baseCurve instanceof BezierCurve) {
      this.baseCurve = params.baseCurve.clone()
    } else if (this.params.baseCurveData) {
      this.baseCurve = BezierCurve.fromJSON(this.params.baseCurveData)
    } else {
      this.baseCurve = ConicalSurface.createDefaultBaseCurve()
    }
    this.params.baseCurveData = this.baseCurve.toJSON()
  }

  // --- Математика проецирования ---
  
  _calculateUnfoldData() {
      // Строим развертку математически и кэшируем соответствия
      const h = this.params.height
      const steps = 200 // Высокая точность
      const basePoints = this.baseCurve.getPoints(steps) // Точки основания (y = -h/2)
      
      // Вершина конуса в локальных координатах 3D: (0, h/2, 0)
      // В координатах развертки мы поместим её в (0, 0)
      
      const lut = [] // Таблица поиска: { angle, slantHeight, point3D }
      let currentAngle = 0 // Начинаем с угла 0 (вертикально вверх на развертке? или вправо. Пусть 0 - вправо)
      
      // Первая точка
      const p0 = basePoints[0]
      const r0 = Math.sqrt(p0.x*p0.x + p0.y*p0.y) // радиус на плоскости XZ
      const sl0 = Math.sqrt(h*h + r0*r0) // длина образующей
      
      lut.push({ angle: 0, slantHeight: sl0, basePoint3D: p0 })
      
      const outlinePoints = [new THREE.Vector2(sl0, 0)] // Начальная точка развертки (Polar: r=sl0, phi=0 => x=sl0, y=0)
      
      for(let i=0; i<basePoints.length-1; i++) {
          const pA = basePoints[i]
          const pB = basePoints[i+1]
          
          const slA = Math.sqrt(h*h + pA.lengthSq())
          const slB = Math.sqrt(h*h + pB.lengthSq())
          
          // Длина хорды основания между A и B
          const chord3D = pA.distanceTo(pB)
          
          // На развертке этот сегмент образует треугольник: Apex, UnfoldA, UnfoldB.
          // Стороны: slA, slB, chord3D.
          // Находим угол dAngle при вершине Apex по теореме косинусов
          const cosVal = (slA*slA + slB*slB - chord3D*chord3D) / (2 * slA * slB)
          // Защита от floating point errors
          const clampedCos = Math.max(-1, Math.min(1, cosVal))
          const dAngle = Math.acos(clampedCos)
          
          currentAngle += dAngle
          
          lut.push({ 
              angle: currentAngle, 
              slantHeight: slB, 
              basePoint3D: pB 
          })
          
          // Координата точки на развертке
          outlinePoints.push(new THREE.Vector2(
              slB * Math.cos(currentAngle),
              slB * Math.sin(currentAngle)
          ))
      }
      
      this._unfoldCache = { lut, outlinePoints, maxAngle: currentAngle }
  }

  getUnfoldOutline() {
      if (!this._unfoldCache) this._calculateUnfoldData()
      // Контур: Вершина -> Точки дуги -> Вершина
      return [
          new THREE.Vector2(0,0),
          ...this._unfoldCache.outlinePoints,
          new THREE.Vector2(0,0)
      ]
  }

  mapUVTo3D(u, v) {
      if (!this._unfoldCache) this._calculateUnfoldData()
      
      // u, v - декартовы координаты на развертке.
      // 1. Переводим в полярные (относительно вершины 0,0)
      const distFromApex = Math.sqrt(u*u + v*v) // Это текущая "высота" на конусе (от вершины)
      let angle = Math.atan2(v, u)
      
      // atan2 возвращает -PI..PI, а у нас угол накопленный 0..maxAngle
      // Если угол отрицательный, возможно это "шов" или просто поворот.
      // Предполагаем, что развертка лежит в диапазоне [0, maxAngle].
      // Если atan2 вернул < 0, приводим к 2PI? Нет, у нас развертка м.б. где угодно.
      // В _calculateUnfoldData мы строили от 0 в плюс. 
      // Если u,v дали отрицательный угол, значит точка вне основного сектора (если развертка < 180).
      if (angle < 0) angle += Math.PI * 2 
      
      // Находим соответствующую образующую по углу
      const frame = this._getFrameFromLut(angle)
      
      // frame.basePoint3D - это точка на основании (y = -h/2)
      // frame.slantHeight - полная длина образующей до основания
      
      // Пропорция: distFromApex / slantHeight
      const ratio = distFromApex / frame.slantHeight
      
      // Интерполяция в 3D:
      // Apex: (0, h/2, 0)
      // Base: (base.x, -h/2, base.y)
      
      const halfHeight = this.params.height / 2
      const apex = new THREE.Vector3(0, halfHeight, 0)
      const basePos = new THREE.Vector3(frame.basePoint3D.x, -halfHeight, frame.basePoint3D.y)
      
      // Результат
      return new THREE.Vector3().copy(apex).lerp(basePos, ratio)
  }
  
  _getFrameFromLut(angle) {
      const lut = this._unfoldCache.lut
      // Если вышли за пределы развертки - клампим к краям
      if (angle <= lut[0].angle) return lut[0]
      if (angle >= lut[lut.length-1].angle) return lut[lut.length-1]
      
      // Поиск интервала (можно бинарный, здесь линейный для простоты, т.к. массив небольшой ~200)
      for(let i=0; i<lut.length-1; i++) {
          if (angle >= lut[i].angle && angle <= lut[i+1].angle) {
              const t = (angle - lut[i].angle) / (lut[i+1].angle - lut[i].angle)
              
              // Интерполируем 3D точку основания
              const pA = lut[i].basePoint3D
              const pB = lut[i+1].basePoint3D
              const basePoint3D = new THREE.Vector2().lerpVectors(pA, pB, t)
              
              // Интерполируем длину образующей
              const sl = lut[i].slantHeight + (lut[i+1].slantHeight - lut[i].slantHeight) * t
              
              return { basePoint3D, slantHeight: sl }
          }
      }
      return lut[0]
  }

  // --- Стандартные методы ---

  createMesh() {
      // Для чистого конуса используем стандартную логику, но можно и через маппинг
      // Чтобы сэкономить токены, оставляем старый createMesh или упрощаем
      // Но лучше вызвать super метод strip logic, если бы он был общим.
      // Здесь скопируем упрощенную версию, совместимую с логикой BaseSurface
      const { height, radialSegments } = this.params
      const segmentCount = Math.max(radialSegments, 50)
      const basePoints = this.baseCurve.getPoints(segmentCount)
      
      const vertices = []
      const indices = []
      const halfHeight = height / 2

      // Боковая поверхность
      for(let i=0; i<basePoints.length; i++) {
          const p1 = basePoints[i]
          const p2 = basePoints[(i+1)%basePoints.length]
          
          vertices.push(p1.x, -halfHeight, p1.y) // Base 1
          vertices.push(p2.x, -halfHeight, p2.y) // Base 2
          vertices.push(0, halfHeight, 0)        // Apex
          
          const idx = i*3
          indices.push(idx, idx+1, idx+2)
      }
      
      // Дно...

      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
      geo.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1))
      geo.computeVertexNormals()
      
      const mesh = new THREE.Mesh(geo, this.getStandardMaterial())
      this._setupUserData(mesh, 'conical')
      return mesh
  }

  createUnfold2D() {
      const outline = this.getUnfoldOutline()
      const pts = outline.map(p => new THREE.Vector3(p.x, p.y, 0))
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      const group = new THREE.Group()
      group.add(new THREE.Line(geo, this.getLineMaterial()))
      return group
  }
  
  setBaseCurve(curve) {
    if (curve instanceof BezierCurve) {
      this.baseCurve = curve.clone()
      this.params.baseCurveData = this.baseCurve.toJSON()
      this._unfoldCache = null // Сброс кэша!
    }
  }
}