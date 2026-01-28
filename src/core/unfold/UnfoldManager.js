import * as THREE from 'three'
import { MapControls } from 'three/examples/jsm/controls/MapControls.js'
import { SurfaceRegistry } from '@/core/surfaces/SurfaceRegistry'
import { SurfaceStrip } from '@/core/surfaces/SurfaceStrip'

export class UnfoldManager {
  constructor(container) {
    this.container = container
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xf0f0f0)

    const aspect = container.clientWidth / container.clientHeight
    this.camera = new THREE.OrthographicCamera(-20 * aspect, 20 * aspect, 20, -20, 0.1, 1000)
    this.camera.position.set(0, 0, 50)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(this.renderer.domElement)

    this.controls = new MapControls(this.camera, this.renderer.domElement)
    this.controls.enableRotate = false
    this.controls.screenSpacePanning = true
    this.controls.enableDamping = true
    this.controls.minZoom = 0.5
    this.controls.maxZoom = 5

    // Для отслеживания редактируемых разверток
    this.unfoldObjects = new Map() // Map: mesh -> { strip, unfoldGroup, contourGroup }
  }

  sync(threeScene) {
    this.scene.clear()
    this.unfoldObjects.clear()

    // Сетка для фона
    const grid = new THREE.GridHelper(100, 50, 0xddd, 0xeee)
    grid.rotation.x = -Math.PI / 2
    this.scene.add(grid)

    let offsetX = 0
    const gap = 5

    threeScene.traverse((obj) => {
      if (obj.isMesh && obj.userData.selectable && obj.userData.surfaceType) {
        try {
          // Получаем strip инстанс
          let stripInstance = null
          
          if (obj.userData.isStrip && obj.userData.stripData) {
            // Новый формат - strip с контуром отреза
            stripInstance = SurfaceStrip.fromJSON(obj.userData.stripData)
          } else if (obj.userData.surfaceType.includes('strip')) {
            // Другой strip формат
            stripInstance = SurfaceRegistry.create(obj.userData.surfaceType, obj.userData.stripData || obj.userData.params)
          } else {
            // Старый формат - просто поверхность
            // Обворачиваем в SurfaceStrip для единообразности
            const baseSurfaceType = obj.userData.surfaceType
            stripInstance = new SurfaceStrip(baseSurfaceType, obj.userData.params || {})
          }

          if (!stripInstance) throw new Error('Failed to create strip instance')

          // Генерируем 2D развертку
          const unfoldGroup = stripInstance.createUnfold2D()

          // Позиционируем развертку
          const bbox = new THREE.Box3().setFromObject(unfoldGroup)
          const width = bbox.max.x - bbox.min.x
          const center = new THREE.Vector3()
          bbox.getCenter(center)
          unfoldGroup.position.sub(center)
          unfoldGroup.position.x += offsetX + width / 2

          this.scene.add(unfoldGroup)

          // Сохраняем информацию для редактирования
          this.unfoldObjects.set(obj, {
            strip: stripInstance,
            unfoldGroup: unfoldGroup,
            mesh: obj
          })

          offsetX += width + gap
        } catch (e) {
          console.warn('Failed to unfold surface:', obj.userData.surfaceType, e)
        }
      }
    })
  }

  /**
   * Получить информацию о развертке по mesh
   */
  getUnfoldObject(mesh) {
    return this.unfoldObjects.get(mesh)
  }

  /**
   * Обновить контур отреза на экране
   */
  updateStripContour(mesh, stripContour) {
    const unfoldObj = this.unfoldObjects.get(mesh)
    if (!unfoldObj) return

    const unfoldGroup = unfoldObj.unfoldGroup
    
    // Удаляем старый контур если есть
    const oldContourLines = unfoldGroup.children.filter(child => 
      child.userData?.isStripContour
    )
    oldContourLines.forEach(line => unfoldGroup.remove(line))

    // Добавляем новый контур
    if (stripContour) {
      const points = stripContour.getPoints(100)
      const threePoints = points.map(p => new THREE.Vector3(p.x, p.y, 0.1))

      const geometry = new THREE.BufferGeometry().setFromPoints(threePoints)
      const material = new THREE.LineBasicMaterial({
        color: 0xff0000,
        linewidth: 3,
        transparent: true,
        opacity: 0.8
      })
      const line = new THREE.Line(geometry, material)
      line.userData.isStripContour = true
      unfoldGroup.add(line)

      // Добавляем точки контура для визуализации
      const pointsGeometry = new THREE.BufferGeometry().setFromPoints(threePoints)
      const pointsMaterial = new THREE.PointsMaterial({
        color: 0xff0000,
        size: 0.15,
        transparent: true,
        opacity: 0.8
      })
      const pointsVisualization = new THREE.Points(pointsGeometry, pointsMaterial)
      pointsVisualization.userData.isStripContour = true
      unfoldGroup.add(pointsVisualization)
    }
  }

  update() {
    this.controls.update()
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }

  resize(w, h) {
    this.renderer.setSize(w, h)
    const aspect = w / h
    this.camera.left = -20 * aspect
    this.camera.right = 20 * aspect
    this.camera.top = 20
    this.camera.bottom = -20
    this.camera.updateProjectionMatrix()
  }

  dispose() {
    this.renderer.dispose()
    this.controls.dispose()
  }
}